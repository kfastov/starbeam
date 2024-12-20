#![cfg(test)]

use soroban_sdk::{testutils::Env, Address, symbol};

#[test]
fn test_account_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AccountContract);
    let telegram_id: i64 = 123456;

    env.invoke_contract(&contract_id, symbol!("initialize"), (telegram_id,));
    let stored_id: i64 = env.storage().get(&symbol!("telegram_user_id")).unwrap();

    assert_eq!(stored_id, telegram_id);
}

#[test]
fn test_verify_and_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AccountContract);
    let from = Address::random(&env);
    let to = Address::random(&env);
    let telegram_id: i64 = 123456;
    let signature = vec![1, 2, 3, 4, 5];

    env.invoke_contract(&contract_id, symbol!("initialize"), (telegram_id,));

    // Valid signature
    assert!(env.invoke_contract(
        &contract_id,
        symbol!("verify_and_transfer"),
        (from.clone(), to.clone(), 50, signature.clone())
    ).is_ok());

    // Invalid signature
    let invalid_signature = vec![6, 7, 8, 9];
    assert!(env.invoke_contract(
        &contract_id,
        symbol!("verify_and_transfer"),
        (from.clone(), to.clone(), 50, invalid_signature)
    ).is_err());
}
