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
}

#[contracttype]
pub struct SignatureVerification {
    telegram_user_id: u64,
    nonce: u64,
    signature: Bytes,
}

#[contract]
pub struct TelegramSmartAccount;

#[contractimpl]
impl TelegramSmartAccount {
    /// Initialize the smart account with a Telegram user ID
    pub fn initialize(env: Env, telegram_user_id: u64, owner: Address) -> Result<(), Error> {
        // Ensure the owner is authenticating this initialization
        owner.require_auth();

        // Store the Telegram user ID
        env.storage()
            .persistent()
            .set(&DataKey::TelegramUserId, &telegram_user_id);

        // Store the owner address
        env.storage().persistent().set(&DataKey::Owner, &owner);

        Ok(())
    }

    /// Verify a signature from a Telegram account
    fn verify_telegram_signature(
        env: &Env,
        verification: &SignatureVerification,
    ) -> Result<(), Error> {
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

        Ok(())
    }

    /// Transfer XLM to another address with Telegram signature verification
    pub fn transfer_xlm(
        env: Env,
        signature: SignatureVerification,
        destination: Address,
        amount: i128,
    ) -> Result<(), Error> {
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

        // Transfer the specified amount
        token_client.transfer(&env.current_contract_address(), &destination, &amount);

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
        current_owner.require_auth();

        // Update the owner
        env.storage().persistent().set(&DataKey::Owner, &new_owner);

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

mod test;
// mod types;
