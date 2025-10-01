#![no_std]
use ed25519_dalek::{Signature as DalekSignature, Verifier, VerifyingKey};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, BytesN, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidSignature = 1,
    UnauthorizedTransfer = 2,
    TelegramIdNotSet = 3,
    AlreadyInitialized = 4,
    InvalidAmount = 5,
    InsufficientBalance = 6,
    InvalidTelegramId = 7,
    InvalidAddress = 8,
}

// Key for storing persistent data
#[contracttype]
pub enum DataKey {
    /// Stores the associated Telegram user ID (u64) for this smart account.
    /// This ID is used for signature verification and account control.
    TelegramUserId,

    /// Stores the owner's address (Address) of this smart account.
    /// The owner has administrative privileges and can be rotated.
    Owner,

    /// Stores the last nonce of this smart account.
    LastNonce,

    /// Stores the wallet public key for ed25519 verification.
    AccountPublicKey,
}

#[contracttype]
pub struct SignatureVerification {
    /// The Telegram user ID of the signer
    telegram_user_id: u64,
    /// Monotonically increasing nonce to prevent replay attacks
    nonce: u64,
    /// Ed25519 signature in bytes, must be exactly 64 bytes
    signature: BytesN<64>,
}

impl SignatureVerification {
    fn validate(&self) -> Result<(), Error> {
        if self.telegram_user_id == 0 {
            return Err(Error::InvalidTelegramId);
        }
        if self.nonce == 0 || self.nonce == u64::MAX {
            return Err(Error::InvalidSignature);
        }
        Ok(())
    }
}

#[contract]
pub struct TelegramSmartAccount;

#[contractimpl]
impl TelegramSmartAccount {
    /// Initialize the smart account with a Telegram user ID
    pub fn initialize(
        env: Env,
        telegram_user_id: u64,
        owner: Address,
        account_public_key: BytesN<32>,
    ) -> Result<(), Error> {
        // Validate telegram_user_id
        if telegram_user_id == 0 {
            return Err(Error::InvalidTelegramId);
        }

        // Ensure the owner is authenticating this initialization
        owner.require_auth();

        // Prevent multiple initializations
        if env.storage().persistent().has(&DataKey::Owner) {
            return Err(Error::AlreadyInitialized);
        }

        // Store the Telegram user ID
        env.storage()
            .persistent()
            .set(&DataKey::TelegramUserId, &telegram_user_id);

        // Store the owner address
        env.storage().persistent().set(&DataKey::Owner, &owner);

        // Store the Telegram public key
        env.storage()
            .persistent()
            .set(&DataKey::AccountPublicKey, &account_public_key);

        // Emit initialization event
        env.events()
            .publish(("initialized",), (telegram_user_id, owner));

        Ok(())
    }

    fn signature_payload(telegram_user_id: u64, nonce: u64) -> [u8; 16] {
        let mut payload = [0u8; 16];
        payload[..8].copy_from_slice(&telegram_user_id.to_be_bytes());
        payload[8..].copy_from_slice(&nonce.to_be_bytes());
        payload
    }

    /// Verify a signature from a Telegram account
    fn verify_telegram_signature(
        env: &Env,
        verification: &SignatureVerification,
    ) -> Result<(), Error> {
        // Validate signature format
        verification.validate()?;

        // Get and validate nonce
        let last_nonce = env
            .storage()
            .persistent()
            .get(&DataKey::LastNonce)
            .unwrap_or(0u64);
        if verification.nonce <= last_nonce {
            return Err(Error::InvalidSignature);
        }

        // Retrieve stored Telegram user ID
        let stored_telegram_user_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::TelegramUserId)
            .ok_or(Error::TelegramIdNotSet)?;

        // Ensure the signature matches the stored Telegram user ID
        if verification.telegram_user_id != stored_telegram_user_id {
            return Err(Error::InvalidSignature);
        }

        let stored_public_key: BytesN<32> = env
            .storage()
            .persistent()
            .get(&DataKey::AccountPublicKey)
            .ok_or(Error::InvalidSignature)?;

        let message = Self::signature_payload(verification.telegram_user_id, verification.nonce);

        let verifying_key = VerifyingKey::from_bytes(&stored_public_key.to_array())
            .map_err(|_| Error::InvalidSignature)?;
        let signature = DalekSignature::from_bytes(&verification.signature.to_array());

        verifying_key
            .verify(&message, &signature)
            .map_err(|_| Error::InvalidSignature)?;

        // Update nonce
        env.storage()
            .persistent()
            .set(&DataKey::LastNonce, &verification.nonce);

        Ok(())
    }

    /// Transfer XLM to another address with Telegram signature verification
    pub fn transfer_xlm(
        env: Env,
        signature: SignatureVerification,
        destination: Address,
        amount: i128,
    ) -> Result<(), Error> {
        // Validate amount
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Verify the Telegram signature
        Self::verify_telegram_signature(&env, &signature)?;

        // Retrieve the owner address
        let owner: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Owner)
            .ok_or(Error::UnauthorizedTransfer)?;

        // Create a token client for the native XLM token
        let token_client = token::TokenClient::new(&env, &env.current_contract_address());

        // Check balance
        let balance = token_client.balance(&env.current_contract_address());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Transfer the specified amount
        owner.require_auth();
        token_client.transfer(&env.current_contract_address(), &destination, &amount);

        // Emit transfer event
        env.events().publish(("transfer",), (destination, amount));

        Ok(())
    }

    /// Rotate the owner of the smart account
    pub fn rotate_owner(
        env: Env,
        signature: SignatureVerification,
        new_owner: Address,
    ) -> Result<(), Error> {
        // Verify the Telegram signature
        Self::verify_telegram_signature(&env, &signature)?;

        // Get and authenticate current owner
        let current_owner: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Owner)
            .ok_or(Error::UnauthorizedTransfer)?;

        // Prevent rotation to same owner
        if current_owner == new_owner {
            return Err(Error::InvalidAddress);
        }

        current_owner.require_auth();
        new_owner.require_auth();

        // Update the owner
        env.storage().persistent().set(&DataKey::Owner, &new_owner);

        // Emit owner rotation event
        env.events()
            .publish(("owner_rotated",), (current_owner.clone(), new_owner));

        Ok(())
    }

    // Update the owner only after both Telegram and current owner approve
    pub fn get_telegram_user_id(env: Env) -> Result<u64, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TelegramUserId)
            .ok_or(Error::TelegramIdNotSet)
    }

    /// Returns the last persisted nonce (0 if no transaction was signed yet).
    pub fn get_last_nonce(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::LastNonce)
            .unwrap_or(0u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::Signer;
    use ed25519_dalek::{Signature, SigningKey, VerifyingKey};
    use soroban_sdk::testutils::Address as TestAddress;

    const PRIMARY_SECRET_KEY: [u8; 32] = [1u8; 32];
    const SECONDARY_SECRET_KEY: [u8; 32] = [2u8; 32];

    fn signing_key(bytes: [u8; 32]) -> SigningKey {
        SigningKey::from_bytes(&bytes)
    }

    fn public_key(env: &Env, key: &VerifyingKey) -> BytesN<32> {
        BytesN::from_array(env, &key.to_bytes())
    }

    fn make_signature(
        env: &Env,
        signer: &SigningKey,
        telegram_user_id: u64,
        nonce: u64,
    ) -> SignatureVerification {
        let payload = TelegramSmartAccount::signature_payload(telegram_user_id, nonce);
        let signature: Signature = signer.sign(&payload);

        SignatureVerification {
            telegram_user_id,
            nonce,
            signature: BytesN::from_array(env, &signature.to_bytes()),
        }
    }

    #[test]
    fn initialize_persists_user_id_and_owner() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        let telegram_user_id: u64 = 42;
        let init_result = client.try_initialize(&telegram_user_id, &owner, &pk);
        assert!(init_result.is_ok());

        let stored_user_id = client
            .try_get_telegram_user_id()
            .expect("telegram user id call should succeed")
            .expect("telegram user id should be set");
        assert_eq!(stored_user_id, telegram_user_id);

        let stored_owner: Address = env.as_contract(&contract_id, || {
            env.storage()
                .persistent()
                .get(&DataKey::Owner)
                .expect("owner stored")
        });
        assert_eq!(stored_owner, owner);
    }

    #[test]
    fn initialize_rejects_zero_user_id() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        let result = client.try_initialize(&0u64, &owner, &pk);
        assert!(result.is_err());
    }

    #[test]
    fn initialize_cannot_run_twice() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        assert!(client.try_initialize(&123u64, &owner, &pk).is_ok());

        let second = client.try_initialize(&123u64, &owner, &pk);
        assert!(second.is_err());
    }

    #[test]
    fn rotate_owner_requires_valid_signature() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let new_owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        client
            .try_initialize(&777u64, &owner, &pk)
            .expect("init call should succeed")
            .expect("init ok");

        let verification = make_signature(&env, &signer, 777, 1);

        match client.try_rotate_owner(&verification, &new_owner) {
            Ok(Ok(())) => {}
            Ok(Err(err)) => panic!("unexpected conversion error: {:?}", err),
            Err(Ok(err)) => panic!("unexpected contract error: {:?}", err),
            Err(Err(err)) => panic!("unexpected host error: {:?}", err),
        }

        let stored_owner: Address = env.as_contract(&contract_id, || {
            env.storage()
                .persistent()
                .get(&DataKey::Owner)
                .expect("owner stored")
        });
        assert_eq!(stored_owner, new_owner);
    }

    #[test]
    fn rotate_owner_rejects_replay_nonce() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let new_owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        client
            .try_initialize(&888u64, &owner, &pk)
            .expect("init call should succeed")
            .expect("init ok");

        let verification = make_signature(&env, &signer, 888, 1);

        match client.try_rotate_owner(&verification, &new_owner) {
            Ok(Ok(())) => {}
            Ok(Err(err)) => panic!("unexpected conversion error: {:?}", err),
            Err(Ok(err)) => panic!("unexpected contract error: {:?}", err),
            Err(Err(err)) => panic!("unexpected host error: {:?}", err),
        }

        match client.try_rotate_owner(&verification, &owner) {
            Ok(Ok(())) => panic!("replay should fail"),
            Ok(Err(err)) => panic!("unexpected conversion error: {:?}", err),
            Err(Ok(err)) => assert_eq!(err, Error::InvalidSignature),
            Err(Err(err)) => panic!("unexpected host error: {:?}", err),
        }
    }

    #[test]
    fn rotate_owner_rejects_wrong_signature() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);
        let new_owner = <Address as TestAddress>::generate(&env);
        let primary = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &primary.verifying_key());
        let secondary = signing_key(SECONDARY_SECRET_KEY);

        client
            .try_initialize(&999u64, &owner, &pk)
            .expect("init call should succeed")
            .expect("init ok");

        let invalid_signature = make_signature(&env, &secondary, 999, 1);

        match client.try_rotate_owner(&invalid_signature, &new_owner) {
            Ok(Ok(())) => panic!("invalid signature should fail"),
            Ok(Err(err)) => panic!("unexpected conversion error: {:?}", err),
            Err(Ok(err)) => assert_eq!(err, Error::InvalidSignature),
            Err(Err(err)) => panic!("unexpected host error: {:?}", err),
        }
    }

    #[test]
    fn last_nonce_reflects_successful_signature() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);

        let owner = <Address as TestAddress>::generate(&env);
        let new_owner = <Address as TestAddress>::generate(&env);
        let signer = signing_key(PRIMARY_SECRET_KEY);
        let pk = public_key(&env, &signer.verifying_key());

        client
            .try_initialize(&555u64, &owner, &pk)
            .expect("init call should succeed")
            .expect("init ok");

        let nonce0 = client
            .try_get_last_nonce()
            .expect("call ok")
            .expect("value");
        assert_eq!(nonce0, 0);

        let verification = make_signature(&env, &signer, 555, 1);

        match client.try_rotate_owner(&verification, &new_owner) {
            Ok(Ok(())) => {}
            other => panic!("unexpected response: {:?}", other),
        }

        let nonce1 = client
            .try_get_last_nonce()
            .expect("call ok")
            .expect("value");
        assert_eq!(nonce1, 1);
    }
}
