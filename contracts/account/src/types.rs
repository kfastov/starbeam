use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidSignature,
    UnauthorizedTransfer,
    TelegramIdNotSet,
}

// Key for storing persistent data
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TelegramUserId,
    Owner,
}

// Signature verification data structure
#[contracttype]

pub struct SignatureVerification {
    telegram_user_id: u64,
    nonce: u64,
    signature: Bytes,
}
