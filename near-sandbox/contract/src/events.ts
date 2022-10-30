import {
    assert,
    near,
    call,
    NearBindgen,
    view,
    LookupMap,
    UnorderedMap,
    NearPromise,
    bytes,
    initialize,
    UnorderedSet,
} from "near-sdk-js";
import { AccountId, ONE_NEAR } from "near-sdk-js/lib/types";
import { internalCreateEvent } from "./internal";
import { Event, EventMetadata, Host, Ticket } from "./metadata";

class EventResult {
    title: string;
    timestamp: string;
    eventId: string;
    host: Host;
    active: boolean;

    constructor({ title, timestamp, eventId, host, active }) {
        this.title = title;
        this.timestamp = timestamp;
        this.eventId = eventId;
        this.host = host;
        this.active = active;
    }
}

const FIVE_TGAS = BigInt(5_000_000_000_000);
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = bytes(JSON.stringify({}));

@NearBindgen({})
export class Events {
    nft_contract_id: AccountId = "";
    owner_id: string = "";
    numberOfEvents: number = 0;
    eventsPerOwner = new LookupMap("eventsPerOwner");
    eventMetadataById = new UnorderedMap("eventsMetadata");
    eventById = new LookupMap("eventById");

    @initialize({})
    init({ nft_contract_id }: { nft_contract_id: AccountId }) {
        this.nft_contract_id = nft_contract_id;
        near.log(`NFT Contract Id set to ${nft_contract_id}`);
    }

    @view({})
    getNFTContractID() {
        return this.nft_contract_id;
    }

    @call({ payableFunction: true })
    createEvent({
        eventId,
        title,
        eventMetadataUrl,
        eventStart,
        hostName,
        price,
    }) {
        assert(!this.eventById.containsKey(eventId), "Event already created!");
        let event_id = internalCreateEvent({
            contract: this,
            eventId,
            title,
            eventMetadataUrl,
            eventStart,
            hostName,
            price,
        });
        return event_id;
    }

    @view({})
    getEvent({ eventId }) {
        let eventMetadata = this.eventMetadataById.get(
            eventId
        ) as EventMetadata;
        let event = this.eventById.get(eventId) as Event;

        return new EventResult({
            title: eventMetadata.title,
            timestamp: event.timestamp,
            eventId,
            host: event.host,
            active: event.active,
        });
    }

    @call({ payableFunction: true })
    buyTicket({ eventId }) {
        let accountId = near.predecessorAccountId();
        let eventMetadata = this.eventMetadataById.get(
            eventId
        ) as EventMetadata;
        let event = this.eventById.get(eventId) as Event;

        let price = event.price;

        assert(
            near.attachedDeposit() >= price,
            "Insufficient funds transferred"
        );
        assert(
            near.blockTimestamp() < BigInt(event.timestamp.valueOf()),
            "Event has already started"
        );
        // assert(
        //     eventMetadata.tiers[tier].ticketsRemaining - amount >= 0 ||
        //         eventMetadata.tiers[tier].ticketsRemaining === -1,
        //     "Not enough tickets available"
        // );

        event.amountCollected += price;
        // eventMetadata.tiers[tier].ticketsRemaining -= 1;

        this.eventMetadataById.set(eventId, eventMetadata);
        this.eventById.set(eventId, event);

        // mint nft on nft contract
        const promise = NearPromise.new(this.nft_contract_id)
            .functionCall(
                "nft_mint",
                bytes(
                    JSON.stringify({
                        token_id: eventId,
                        metadata: {
                            title: "NearPass #1",
                            description: "Ticket to NearPass event",
                            issuedAt: near.blockTimestamp().toString(),
                        },
                        receiver_id: accountId,
                    })
                ),
                ONE_NEAR,
                BigInt(14_000_000_000_000)
            )
            .then(
                NearPromise.new(near.currentAccountId()).functionCall(
                    "buyTicketCallback",
                    bytes(
                        JSON.stringify({
                            accountId: accountId,
                            eventId: eventId,
                        })
                    ),
                    NO_DEPOSIT,
                    BigInt(14_000_000_000_000)
                )
            );

        return promise.asReturn();
    }

    @call({ privateFunction: true })
    buyTicketCallback({ accountId, eventId, tier }) {
        let succeeded = false;
        let result = undefined;

        try {
            result = near.promiseResult(0) as string;
            succeeded = true;
        } catch (e) {
            // rollback
            near.log(`Catch ${e}`); // Catch {}
        } finally {
            if (succeeded) {
                let ticketId = near.promiseResult(0) as string;
                let ticket = new Ticket({
                    ticketId,
                    accountId: accountId,
                    eventId: eventId,
                });

                let event = this.eventById.get(eventId) as Event;

                event.tickets.set(ticket);

                this.eventById.set(eventId, event);
                near.log(`${accountId} minted ${eventId} ticket: Tier ${tier}`);
                return ticketId;
            } else {
                near.log("Promise failed");
            }
        }
    }

    // cancel event before it starts and refund to all ticket buyers, only organizer should be able to cancel.
    @call({})
    cancelEvent({ eventId }) {
        let event = this.eventById.get(eventId) as Event;
        // if the event has already started, it cannot be cancelled
        assert(event === null, "No such event exists");
        assert(
            near.blockTimestamp() < BigInt(event.timestamp.valueOf()),
            "Event has already started"
        );
        // mark event as inactive.
        event.active = false;
        // mark amountCollected as zero.
        event.amountCollected = 0;

        // all tickets are now marked as redeemable, which lets users to claim their funds.
        for (let i = 0; i < event.tickets.length; i++) {
            (event.tickets[i] as Ticket).redeemable = true;
        }

        this.eventById.set(eventId, event);

        near.log(`${event.title} is now cancelled!`);
    }

    // let organizer withdraw when event ends.
    @call({})
    withdraw({ eventId }) {
        let event = this.eventById.get(eventId) as Event;
        let accountId = near.predecessorAccountId();
        // check if the event is active.
        assert(event.active, "Event is not active");
        // check if the event has already started.
        assert(
            BigInt(event.timestamp) > near.blockTimestamp(),
            "Event hasn't started cannot withdraw"
        );
        // check if the event has amountCollected > 0
        assert(event.amountCollected > 0, "No Funds were collected");
        // check if the caller is the host
        assert(
            event.host.accountId == accountId,
            "Only host can withdraw funds"
        );

        const promise = near.promiseBatchCreate(event.host.accountId);
        near.promiseBatchActionTransfer(promise, event.amountCollected);

        return event.amountCollected;
    }

    // let attendee claim funds for the ticket when the event is cancelled.
    @call({})
    claimRefund({
        eventId,
        ticketIds,
    }: {
        eventId: string;
        ticketIds: string[];
    }) {
        let event = this.eventById.get(eventId) as Event;
        assert(event.active, "Event is still active");
        for (let j = 0; j < ticketIds.length; j++) {
            for (let i = 0; i < event.tickets.length; i++) {
                let ticket = event.tickets[i] as Ticket;
                if (ticket.ticketId === ticketIds[j]) {
                    assert(!ticket.used, "Ticket is used cannot refund");
                    assert(ticket.redeemable, "Ticket already redeemed");
                    const promise = near.promiseBatchCreate(ticket.accountId);
                    near.promiseBatchActionTransfer(promise, event.price);
                    ticket.redeemable = false;
                }
            }
        }
        this.eventById.set(eventId, event);
    }
}
