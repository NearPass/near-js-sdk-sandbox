import { call, NearBindgen, bytes, NearPromise, near } from "near-sdk-js";

const FIVE_TGAS = BigInt("50000000000000");
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = bytes(JSON.stringify({}));

@NearBindgen({})
export class CrossCallCounter {
    returned: string = "0";
    @call({})
    crossCallIncrement({ contractId }) {
        const promise = NearPromise.new(contractId)
            .functionCall(
                "increase",
                bytes(JSON.stringify({})),
                BigInt(0),
                BigInt(10_000_000_000_000)
            )
            .then(
                NearPromise.new(near.currentAccountId()).functionCall(
                    "crossCallCallback",
                    NO_ARGS,
                    NO_DEPOSIT,
                    FIVE_TGAS
                )
            );
    }

    @call({ privateFunction: true })
    crossCallCallback() {
        this.returned = near.promiseResult(0) as string;
        return this.returned;
    }
}
