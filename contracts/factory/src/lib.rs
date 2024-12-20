#![no_std]

use soroban_sdk::{contractimpl, symbol, Address, Bytes, Env, IntoVal, TryFromVal};

pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    pub fn create_account(
        env: Env,
        telegram_user_id: i64,
        telegram_signature: Bytes,
    ) -> Result<Address, &'static str> {
        // Simplified signature verification logic
        if telegram_signature.len() as i64 != telegram_user_id {
            return Err("Invalid Telegram signature!");
        }

        // Deploy the account contract
        let account_id = env.deployer().deploy_contract(
            Bytes::from_slice(&[0]), // Replace with compiled WASM binary
            symbol!("account_contract"),
        );

        // Initialize the account contract with Telegram User ID
        let init_result = env.invoke_contract(
            &account_id,
            symbol!("initialize"),
            (telegram_user_id,),
        );
        if let Err(e) = init_result {
            return Err("Failed to initialize account contract.");
        }

        Ok(account_id)
    }
}
