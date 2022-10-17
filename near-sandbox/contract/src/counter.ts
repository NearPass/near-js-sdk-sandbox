import { call, NearBindgen, bytes, NearPromise, view } from "near-sdk-js";

@NearBindgen({})
export class Counter {
    counter: number = 0;

    @call({})
    increase({ n = 1 }) {
        this.counter += n;
        return this.counter;
    }

    @call({})
    decrease() {
        this.counter -= 1;
        return this.counter;
    }

    @view({})
    get_counter() {
        return this.counter;
    }
}
