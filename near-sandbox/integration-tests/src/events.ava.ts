import {
    Worker,
    NEAR,
    NearAccount,
    ONE_NEAR,
    parseNEAR,
} from "near-workspaces";
import anyTest, { TestFn } from "ava";

const EVENT_METADATA = {
    eventId: "nearpass",
    title: "NearPass",
    hostName: "Nikhil",
    price: ONE_NEAR,
    eventMetadata: {
        eventType: "virtual",
        hostemail: "nikhil@gmail.com",
        telegram: "t.me/joincelo",
        faqquestion1: "What is the age limit?",
        answer1: "18+",
        description: "Best event ever!",
    },
    eventStart: "1668814926000000000",
};

const EVENT_RESULT = {
    title: "NearPass",
    timestamp: "1668814926000000000",
    eventId: "nearpass",
    host: { name: "Nikhil", accountId: "ali.test.near" },
    active: true,
};

const test = anyTest as TestFn<{
    worker: Worker;
    accounts: Record<string, NearAccount>;
}>;

test.beforeEach(async (t) => {
    const worker = await Worker.init();

    const root = worker.rootAccount;
    const events = await root.createSubAccount("events");
    const nft = await root.createSubAccount("nft");
    const ali = await root.createSubAccount("ali");
    const bob = await root.createSubAccount("bob");

    await events.deploy(process.argv[2]);
    await nft.deploy(process.argv[3]);

    await events.call(events, "init", { nft_contract_id: nft.accountId });
    await nft.call(nft, "init", { owner_id: events.accountId });

    t.context.worker = worker;
    t.context.accounts = { root, events, nft, ali, bob };
});

test.afterEach.always(async (t) => {
    // Stop Sandbox server
    await t.context.worker.tearDown().catch((error) => {
        console.log("Failed to stop the Sandbox:", error);
    });
});

test("User can create events", async (t) => {
    const { events, ali, bob } = t.context.accounts;
    await ali.call(events, "createEvent", EVENT_METADATA, {
        attachedDeposit: NEAR.parse("1"),
    });
    let result = await events.view("getEvent", { eventId: "nearpass" });
    t.deepEqual(result, EVENT_RESULT);
});

test("Not able to create duplicate event", async (t) => {
    const { events, ali } = t.context.accounts;
    await ali.call(events, "createEvent", EVENT_METADATA, {
        attachedDeposit: NEAR.parse("1"),
    });
    await t.throwsAsync(
        ali.call(events, "createEvent", EVENT_METADATA, {
            attachedDeposit: NEAR.parse("1"),
        })
    );
});

test("directly mint NFT", async (t) => {
    const { nft, ali, bob } = t.context.accounts;
    await t.throwsAsync(
        ali.call(
            nft,
            "nft_mint",
            {
                token_id: "nearpass",
                metadata: {
                    title: "NearPass #1",
                    description: "Ticket to NearPass event",
                    issuedAt: "12387123891723812371",
                },
                receiver_id: ali.accountId,
            },
            {
                attachedDeposit: NEAR.parse("1"),
            }
        )
    );

    // await t.throwsAsync(
    //     nft.view("nft_supply_for_owner", {
    //         account_id: ali.accountId,
    //     })
    // );
});

test("User should be able to buy tickets", async (t) => {
    const { events, nft, ali, bob } = t.context.accounts;
    await ali.call(events, "createEvent", EVENT_METADATA, {
        attachedDeposit: NEAR.parse("1"),
    });
    let tokenId = await bob.call(
        events,
        "buyTicket",
        { eventId: "nearpass" },
        {
            attachedDeposit: NEAR.parse("2"),
            gas: BigInt(300_000_000_000_000).toString(),
        }
    );

    let result = await nft.view("nft_supply_for_owner", {
        account_id: bob.accountId,
    });
    t.is(result, 1);
});

test("Should be able to cancel event", async (t) => {
    const { events, ali: eventOrganiser } = t.context.accounts;
    let eventId = await eventOrganiser.call(
        events,
        "createEvent",
        EVENT_METADATA,
        {
            attachedDeposit: NEAR.parse("1"),
        }
    );

    await eventOrganiser.call(events, "cancelEvent", { eventId }, {});
});

test.only("User should be able to claim refund if the event is cancelled", async (t) => {
    const {
        events,
        ali: eventOrganiser,
        bob: ticketBuyer,
    } = t.context.accounts;
    let eventId = await eventOrganiser.call(
        events,
        "createEvent",
        EVENT_METADATA,
        {
            attachedDeposit: NEAR.parse("1"),
        }
    );

    let ticketId = await ticketBuyer.call(
        events,
        "buyTicket",
        { eventId },
        {
            attachedDeposit: NEAR.parse("1"),
            gas: BigInt(300_000_000_000_000).toString(),
        }
    );

    await eventOrganiser.call(events, "cancelEvent", { eventId }, {});
    await ticketBuyer.call(events, "claimRefund", { eventId, ticketId }, {});
});
