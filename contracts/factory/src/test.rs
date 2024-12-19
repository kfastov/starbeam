#![cfg(test)]

use super::{generate_salt, Factory, FactoryClient};
use soroban_sdk::{BytesN, Env};

#[test]
fn test_deploy_account_with_valid_signature() {
    let env = Env::default();
    let factory_client = FactoryClient::new(&env, &env.register_contract(None, Factory));

    let telegram_uid = BytesN::from_array(&env, &[0; 32]);
    let signature = BytesN::from_array(&env, &[0; 64]);

    let address = factory_client.deploy_account(&telegram_uid, &signature);

    let retrieved_address = factory_client.get_account(&telegram_uid);

    assert_eq!(retrieved_address, Some(address));
}

#[test]
#[should_panic(expected = "Invalid signature: Ownership verification failed")]
fn test_deploy_account_with_invalid_signature() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);
    let factory_client = FactoryClient::new(&env, &factory_id);

    // not matching the UID's first byte
    let telegram_uid = BytesN::from_array(&env, &[1; 32]);
    let invalid_signature = BytesN::from_array(&env, &[2; 64]);

    // Attempt to deploy account with an invalid signature, should panic
    factory_client.deploy_account(&telegram_uid, &invalid_signature);
}

#[test]
#[should_panic(expected = "Account already exists for this Telegram UID")]
fn test_redeploy_account() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);
    let factory_client = FactoryClient::new(&env, &factory_id);

    let telegram_uid = BytesN::from_array(&env, &[1; 32]);
    let signature = BytesN::from_array(&env, &[1; 64]);

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

    assert_eq!(retrieved_address, None);
}

#[test]
fn test_generate_salt() {
    let env = Env::default();

    let telegram_uid_1 = BytesN::from_array(&env, &[1; 32]);
    let signature_1 = BytesN::from_array(&env, &[1u8; 64]);

    let telegram_uid_2 = BytesN::from_array(&env, &[2u8; 32]);
    let signature_2 = BytesN::from_array(&env, &[2u8; 64]);

    let telegram_uid_3 = BytesN::from_array(&env, &[3u8; 32]);
    let signature_3 = BytesN::from_array(&env, &[3u8; 64]);

    // generate salt
    let salt_1 = generate_salt(&env, &telegram_uid_1, &signature_1);
    let salt_2 = generate_salt(&env, &telegram_uid_2, &signature_2);
    let salt_3 = generate_salt(&env, &telegram_uid_3, &signature_3);

    // Assert the salts are different
    assert_ne!(salt_1, salt_2);
    assert_ne!(salt_3, salt_2);
}
