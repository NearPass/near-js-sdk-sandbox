import { Worker, NEAR, NearAccount } from "near-workspaces";
import anyTest, { TestFn } from "ava";

const test = anyTest as TestFn<{
    worker: Worker;
    accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
    const worker = await Worker.init();

    const root = worker.rootAccount;
    const counter = await root.createSubAccount("counter");
    const crossCallCounter = await root.createSubAccount("crosscallcounter");
    await counter.deploy(process.argv[2]);
    await crossCallCounter.deploy(process.argv[3]);

    t.context.worker = worker;
    t.context.accounts = { root, counter, crossCallCounter };
});

test.afterEach(async (t) => {
    // Stop Sandbox server
    await t.context.worker.tearDown().catch((error) => {
        console.log("Failed to stop the Sandbox:", error);
    });
});

test("cross contract increment", async (t) => {
    const { counter, crossCallCounter } = t.context.accounts;

    let result = await crossCallCounter.call(
        crossCallCounter,
        "crossCallIncrement",
        { contractId: counter.accountId },
        {}
    );

    console.log(result);

    let message = await counter.view("get_counter");
    t.deepEqual(message, Number(result));
});
