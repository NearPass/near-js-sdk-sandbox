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