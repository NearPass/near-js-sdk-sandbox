import { NearBindgen, near, call, view } from "near-sdk-js";

@NearBindgen({})
export class Counter {
    count = 0;
    constructor() {
        this.count = 0;
    }

    @call({})
    increase({ n = 1 }) {
        this.count += n;
        near.log(`Counter increased to ${this.count}`);
    }

    @call({})
    decrease() {
        this.count -= 1;
        near.log(`Counter decreased to ${this.count}`);
    }

    @view({})
    getCount() {
        return this.count;
    }
}
