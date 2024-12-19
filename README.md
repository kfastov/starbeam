# StarBeam

StarBeam is a smart Stellar wallet being developed as a Telegram mini app (currently in early stages of development).
The goal is to create a wallet that will be tied to your Telegram account, allowing token transfers between Telegram users and regular Stellar wallets.
Once completed, it will also serve as a foundation for other Stellar-based mini apps.
Join https://t.me/starbeam_dev to stay updated.


## Setting Up the Build Environment

To start working on **StarBeam**, follow the steps below:

### Step 1: Set up the Telegram Bot and App

Before setting up the development environment for the **StarBeam** Stellar wallet, you'll need to configure the testing environment for the Telegram bot and app. This includes:

- Creating a bot using **BotFather**.
- Setting up a new app on Telegram.
- Exposing your local development environment to the public using **Ngrok**.

For detailed instructions on how to accomplish these steps, please go to the guide below:

### [Setting up Testing Environment in Telegram](./docs/telegram-setup.md.md)

## Upcoming Features

- Send and receive XLM
- View transaction history
- View account balance
- Ability to serve as a base layer for other mini-apps

## Project Structure

This repository uses the following structure:
```text
.
├── packages
│   ├── bot
│   │   └── // Telegram bot implementation
│   └── webapp
│       └── // Next.js mini-app frontend
├── contracts
│   └── account
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- The `packages/bot` directory contains the Telegram bot implementation
- The `packages/webapp` directory contains a Next.js project that serves as the mini-app frontend
- The `packages/contracts/account` contains a Soroban smart contract that manages user accounts tied to Telegram user IDs
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.

## Setting up building environment

See [SETUP](./SETUP.md) for more details

## Initializing the environment (create deployer identity, build contracts, deploy contracts and generate typescript bindings)

```sh
./initialize.sh
```

## Building the contracts

```sh
stellar contract build
```

## Testing contracts

```sh
cargo test
```

## Optimizing contracts

```sh
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/account.wasm
```

## Deploying contracts to testnet

Note: Use your own account name instead of `alice`

```sh
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/account.wasm \
  --source alice \
  --network futurenet \
  --alias account
```

## Generating Typescript bindings

Note: This is automatically run when you run `yarn install`, but you can also run it manually with:

```sh
yarn bindings
```
