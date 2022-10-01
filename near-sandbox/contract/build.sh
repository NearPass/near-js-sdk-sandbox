#!/bin/sh

echo ">> Building contract"

near-sdk-js build src/events.ts build/events.wasm
