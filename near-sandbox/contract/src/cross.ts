import { call, NearBindgen, bytes, NearPromise } from "near-sdk-js";

@NearBindgen({})
export class CrossCallCounter {
    @call({})
    crossCallIncrement({ contractId }) {
        const promise = NearPromise.new(contractId).functionCall(
            "increase",
            bytes(JSON.stringify({})),
            BigInt(0),
            BigInt(10_000_000_000_000)
        );

        return promise.asReturn();
    }
}
