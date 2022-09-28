import { NearBindgen, near, call, view, UnorderedMap } from "near-sdk-js";

@NearBindgen({})
export class MapTest {
    unorderedMap = new UnorderedMap("a");

    @call({})
    set({ n }) {
        const accountId = near.predecessorAccountId();
        this.unorderedMap.set(accountId, n);
        near.log(`Set ${n} for ${accountId}`);
    }

    @view({})
    get({ accountId }) {
        // cannot do this in view
        return this.unorderedMap.get(accountId);
    }
}
