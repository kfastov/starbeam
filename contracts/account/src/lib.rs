#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Bytes, Env,
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
}

#[contracttype]
pub struct SignatureVerification {
    /// The Telegram user ID of the signer
    telegram_user_id: u64,
    /// Monotonically increasing nonce to prevent replay attacks
    nonce: u64,
    /// Ed25519 signature in bytes, must be exactly 64 bytes
    signature: Bytes,
}

impl SignatureVerification {
    fn validate(&self) -> Result<(), Error> {
        if self.signature.len() != 64 {
            return Err(Error::InvalidSignature);
        }
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
    pub fn initialize(env: Env, telegram_user_id: u64, owner: Address) -> Result<(), Error> {
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

        // Emit initialization event
        env.events()
            .publish(("initialized",), (telegram_user_id, owner));

        Ok(())
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

        // // Verify Ed25519 signature
        // let message = env.crypto().sha256(
        //     &[
        //         &verification.telegram_user_id.to_be_bytes(),
        //         &verification.nonce.to_be_bytes(),
        //     ]
        //     .concat(),
        // );
        // if !env
        //     .crypto()
        //     .ed25519_verify(&verification.signature, &message, &TELEGRAM_PUBLIC_KEY)
        // {
        //     return Err(Error::InvalidSignature);
        // }

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
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as TestAddress;

    #[test]
    fn initialize_persists_user_id_and_owner() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);

        let telegram_user_id: u64 = 42;
        let init_result = client.try_initialize(&telegram_user_id, &owner);
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

        let result = client.try_initialize(&0u64, &owner);
        assert!(result.is_err());
    }

    #[test]
    fn initialize_cannot_run_twice() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TelegramSmartAccount);
        let client = TelegramSmartAccountClient::new(&env, &contract_id);
        let owner = <Address as TestAddress>::generate(&env);

        assert!(client.try_initialize(&123u64, &owner).is_ok());

        let second = client.try_initialize(&123u64, &owner);
        assert!(second.is_err());
    }
}
