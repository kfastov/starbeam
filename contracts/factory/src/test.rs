#![cfg(test)]

use super::{generate_salt, Factory};
use soroban_sdk::{BytesN, Env};

// Test init function
#[should_panic(expected = "Already Inited")]
#[test]
fn test_init() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);
    let wasm_hash = BytesN::from_array(&env, &[0; 32]);

    env.as_contract(&factory_id, || {
        Factory::init(env.clone(), wasm_hash.clone());
    });

    env.as_contract(&factory_id, || {
        Factory::init(env.clone(), wasm_hash.clone());
    });
}

#[test]
fn test_deploy_account_with_valid_signature() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);

    let telegram_uid = BytesN::from_array(&env, &[0; 32]);
    let signature = BytesN::from_array(&env, &[0; 64]);

    let wasm_hash = BytesN::from_array(&env, &[1; 32]);
    env.as_contract(&factory_id, || {
        Factory::init(env.clone(), wasm_hash.clone());
    });

    let address = env.as_contract(&factory_id, || {
        Factory::deploy_account(env.clone(), telegram_uid.clone(), signature.clone())
    });

    let retrieved_address = env.as_contract(&factory_id, || {
        Factory::get_account(&env, telegram_uid.clone())
    });

    assert_eq!(retrieved_address, Some(address));
}

#[test]
#[should_panic(expected = "Invalid signature: Ownership verification failed")]
fn test_deploy_account_with_invalid_signature() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);

    let wasm_hash = BytesN::from_array(&env, &[2; 32]);
    env.as_contract(&factory_id, || {
        Factory::init(env.clone(), wasm_hash.clone());
    });

    // not matching the UID's first byte
    let telegram_uid = BytesN::from_array(&env, &[1; 32]);
    let invalid_signature = BytesN::from_array(&env, &[2; 64]);

    // Attempt to deploy account with an invalid signature, should panic
    env.as_contract(&factory_id, || {
        Factory::deploy_account(env.clone(), telegram_uid.clone(), invalid_signature.clone())
    });
}

#[test]
#[should_panic(expected = "Account already exists for this Telegram UID")]
fn test_redeploy_account() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);

    let telegram_uid = BytesN::from_array(&env, &[1; 32]);
    let signature = BytesN::from_array(&env, &[1; 64]);

    let wasm_hash = BytesN::from_array(&env, &[3; 32]);
    env.as_contract(&factory_id, || {
        Factory::init(env.clone(), wasm_hash.clone());
    });

    // Deploy account
    env.as_contract(&factory_id, || {
        Factory::deploy_account(env.clone(), telegram_uid.clone(), signature.clone());
    });

    // Attempt redeploy with same Telegram UID
    env.as_contract(&factory_id, || {
        Factory::deploy_account(env.clone(), telegram_uid.clone(), signature.clone());
    });
}

#[test]
fn test_get_account_for_unmapped_uid() {
    let env = Env::default();
    let factory_id = env.register_contract(None, Factory);

    let unmapped_uid = BytesN::from_array(&env, &[3; 32]);

    // retrieve an account for an unmapped UID
    let retrieved_address = env.as_contract(&factory_id, || {
        Factory::get_account(&env, unmapped_uid.clone())
    });

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
