#!/bin/sh

echo ">> Building contract"

# near-sdk-js build src/counter.ts build/counter.wasm
# near-sdk-js build src/cross.ts build/cross.wasm
near-sdk-js build src/events.ts build/events.wasm
near-sdk-js build src/nft/index.ts build/nft.wasm

