# Setting up the development environment

This guide will help you set up the development environment for StarBeam.
Please note that this is a work in progress and the instructions may be incomplete.
Feel free to open an issue if you have any questions or suggestions.

## Common tools

Install Rust toolchain:

https://www.rust-lang.org/

## Stellar-related dependencies

1. Install wasm target for Rust

```sh
rustup target add wasm32-unknown-unknown
```

2. Install Stellar CLI

If you're on Mac, use `brew install stellar-cli`
On Linux, you can install with Cargo: `cargo install --locked stellar-cli@22.0.1 --features opt`

3. Initialize the environment

Run the `initialize.sh` script. It will create a deployer identity, build contracts, deploy contracts and generate typescript bindings.

```sh
./initialize.sh
```

4. Use `localias` to debug the mini-app locally (optional)

You can use `localias` to redirect all requests to the mini-app host to your local development server.

- Install `localias` from its repository: https://github.com/peterldowns/localias
- Add alias for the mini-app hostname:

    ```sh
    localias set starbeam-webapp.vercel.app 3000
    ```

- Start dev server:

    ```sh
    yarn dev
    ```

- Run localias:

    ```sh
    localias start
    ```

You can now open the mini-app in Telegram and it will be served from your local server.


# Setting up Testing Environment for Telegram Bots

To set up the testing environment for the Telegram bot associated with this project, please refer to the [Telegram Testing Setup Guide](./docs/telegram-setup.md). This guide will walk you through the process of creating and configuring a bot, setting up the Telegram app, and testing locally with Ngrok.

Before proceeding with the setup, ensure you have configured the following environment variables:
`BOT_TOKEN`: Your Telegram bot token obtained from BotFather
`WEBAPP_URL`: The URL where your web application is hosted (e.g., your Ngrok URL during local development)