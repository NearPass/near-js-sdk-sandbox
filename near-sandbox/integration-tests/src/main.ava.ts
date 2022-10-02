import { Worker, NearAccount, NEAR } from "near-workspaces";
import anyTest, { TestFn } from "ava";

const test = anyTest as TestFn<{
    worker: Worker;
    accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
    // Init the worker and start a Sandbox server
    const worker = await Worker.init();

    // Deploy contract
    const root = worker.rootAccount;
    const contract = await root.createSubAccount("test-account");
    // Get wasm file path from package.json test script in folder above
    await contract.deploy(process.argv[2]);

    // Save state for test runs, it is unique for each test
    t.context.worker = worker;
    t.context.accounts = { root, contract };
});

test.afterEach(async (t) => {
    // Stop Sandbox server
    await t.context.worker.tearDown().catch((error) => {
        console.log("Failed to stop the Sandbox:", error);
    });
});

test("create an event", async (t) => {
    const { contract } = t.context.accounts;

    await contract.call(
        contract,
        "createEvent",
        {
            eventId: "events-2",
            title: "NearPass Genesis",
            eventMetadataUrl: "https://www.google.com",
            hostName: "Nikhil",
            tiersInformation: {
                price: 12,
                thumbnail: "https://www.google.com",
                maxAllowed: 12,
            },
        },
        { attachedDeposit: NEAR.parse("0.00588").toString() }
    );

    let message = await contract.view("getEvent", { eventId: "events-2" });

    t.deepEqual(message, {
        title: "NearPass Genesis",
        eventMetadata: "https://www.google.com",
        host: { name: "Nikhil", accountId: contract.accountId },
        tiers: [
            { price: 12, thumbnail: "https://www.google.com", maxAllowed: 12 },
        ],
    });
});

// test("changes the message", async (t) => {
//     const { root, contract } = t.context.accounts;
//     await root.call(contract, "set_greeting", { message: "Howdy" });
//     const message: string = await contract.view("get_greeting", {});
//     t.is(message, "Howdy");
// });
