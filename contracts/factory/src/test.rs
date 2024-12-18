#![cfg(test)]
use soroban_sdk::{testutils::Env, Address, Bytes, symbol};
use super::FactoryContract;

#[test]
fn test_create_account() {
    let env = Env::default();
    let factory_id = env.register_contract(None, FactoryContract);

    let telegram_id: i64 = 123456;
    let valid_signature = Bytes::from_slice(&[1, 2, 3, 4, 5]);

    // Test valid case
    let account_id = env.invoke_contract(
        &factory_id,
        symbol!("create_account"),
        (telegram_id, valid_signature.clone()),
    );
    assert!(account_id.is_ok());

    // Test invalid signature
    let invalid_signature = Bytes::from_slice(&[6, 7, 8]);
    let result = env.invoke_contract(
        &factory_id,
        symbol!("create_account"),
        (telegram_id, invalid_signature),
    );
    assert!(result.is_err());
}
