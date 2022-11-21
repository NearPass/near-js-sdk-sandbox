#!/bin/sh

./build.sh

if [ $? -ne 0 ]; then
  echo ">> Error building contract"
  exit 1
fi

echo ">> Deploying contract"

# https://docs.near.org/tools/near-cli#near-dev-deploy
echo '{ "nft_contract_id": "'"$CONTRACT"'" }'
near dev-deploy --wasmFile build/events.wasm --initFunction init --initArgs '{ "nft_contract_id": "'"$CONTRACT"'" }'
export EVENTS=$(cat ./neardev/dev-account)
near call "$CONTRACT" setOwnerId '{ "owner_id": "'"$EVENTS"'" }' --accountId "$EVENTS"
near call "$CONTRACT" setMetadata '{ "metadata": { "spec": "nft-1.0.0", "name": "NearPass", "symbol": "NP" } }' --accountId "$EVENTS"
