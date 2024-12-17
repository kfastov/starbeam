#!/bin/bash

set -e

if [[ -f "./.stellar/contract-ids/account.json" ]]; then
  echo "Found existing './.stellar' directory; already initialized."
  exit 0
fi

# Generate TypeScript bindings
echo "Generating TypeScript bindings..."
soroban bindings generate --output ./temp/bindings.ts --overwrite

# if [[ -f "./target/bin/stellar" ]]; then
#   echo "Using stellar binary from ./target/bin"
# else
#   echo "Building pinned stellar binary"
#   cargo install_stellar_cli
# fi


# TODO: support standalone network (run from docker)
NETWORK="futurenet"

echo "Using $NETWORK network"

if !(stellar keys ls | grep deployer 2>&1 >/dev/null); then
  echo Create the deployer identity
  stellar keys generate deployer --network futurenet --fund
else
  echo "Deployer identity already exists"
fi
ABUNDANCE_ADMIN_ADDRESS="$(stellar keys address deployer)"

ARGS="--network $NETWORK --source deployer"

echo Build contracts
stellar contract build

echo Deploy the abundance token contract
ACCOUNT_ID="$(
  stellar contract deploy $ARGS \
    --wasm target/wasm32-unknown-unknown/release/account.wasm \
    --alias account
)"
echo "Contract deployed succesfully with ID: $ACCOUNT_ID"

# TODO: invoke contracts to initialize them