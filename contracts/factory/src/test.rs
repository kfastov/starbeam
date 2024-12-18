#![cfg(test)]

use super::{Factory, FactoryClient};
use soroban_sdk::{BytesN, Env};

#[test]
fn test_factory() {
    let env = Env::default();
    let factory_client = FactoryClient::new(&env, &env.register_contract(None, Factory));

    let telegram_uid = BytesN::from_array(&env, &[0; 32]);
    let signature = BytesN::from_array(&env, &[0; 64]);

    let address = factory_client.deploy_account(&telegram_uid, &signature);

    let retrieved_address = factory_client.get_account(&telegram_uid);

    assert_eq!(retrieved_address, Some(address));
}

#[test]
#[should_panic(expected = "Account already exists for this Telegram UID")]
fn test_redeploy_account() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);
    let factory_client = FactoryClient::new(&env, &factory_id);

    let telegram_uid = BytesN::from_array(&env, &[1; 32]);
    let signature = BytesN::from_array(&env, &[2; 64]);

    // Deploy account
    factory_client.deploy_account(&telegram_uid, &signature);

    // Attempt redeploy with same Telegram UID
    factory_client.deploy_account(&telegram_uid, &signature);
}

#[test]
fn test_get_account_for_unmapped_uid() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);
    let factory_client = FactoryClient::new(&env, &factory_id);

    let unmapped_uid = BytesN::from_array(&env, &[3; 32]);

    // retrieve an account for an unmapped UID
    let retrieved_address = factory_client.get_account(&unmapped_uid);

    // Assert that the result is None
    assert_eq!(retrieved_address, None);
}
