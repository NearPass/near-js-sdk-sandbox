#!/bin/sh

echo ">> Building contract"

near-sdk-js build src/map.ts build/map.wasm
