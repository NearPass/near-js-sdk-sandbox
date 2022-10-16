near dev-deploy --wasmFile near-sandbox/contract/build/nft.wasm
export CONTRACT=$(cat ./neardev/dev-account)
echo $CONTRACT 
cd near-sandbox 
yarn deploy
export EVENTS=$(cat ./contract/neardev/dev-account)
# near view "$EVENTS" getNFTContractID
near call "$EVENTS" createEvent '{ "eventId": "nearpass", "title": "NearPass", "eventMetadataUrl": "someurl", "eventStart": "1665977063000000000", "hostName": "Nikhil", "tiersInformation": [ { "price": 1, "thumbnail": "thumbnail_url", "ticketsRemaining": 10 } ] }' --accountId "$EVENTS" --deposit 1
near call "$EVENTS" buyTicket '{ "eventId": "nearpass" }' --accountId "$EVENTS" --deposit 1
rm -rf ./contract/neardev
rm -rf ../neardev