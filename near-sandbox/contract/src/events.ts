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
} from "near-sdk-js";
import { promiseResult } from "near-sdk-js/lib/api";
import { AccountId } from "near-sdk-js/lib/types";
import { internalCreateEvent } from "./internal";
import { Event, EventMetadata, Host, Ticket, Tier } from "./metadata";

class EventResult {
    title: string;
    timestamp: string;
    eventId: string;
    tiers: Tier[];
    host: Host;
    active: boolean;

    constructor({ title, timestamp, eventId, tiers, host, active }) {
        this.title = title;
        this.timestamp = timestamp;
        this.eventId = eventId;
        this.tiers = tiers;
        this.host = host;
        this.active = active;
    }
}

@NearBindgen({})
export class Events {
    nft_contract_id: AccountId;
    owner_id: string = "";
    numberOfEvents: number = 0;
    eventsPerOwner = new LookupMap("eventsPerOwner");
    eventMetadataById = new UnorderedMap("eventsMetadata");
    eventById = new LookupMap("eventById");
    ticketById = new LookupMap("ticketById");

    @initialize({})
    init({ nft_contract_id }: { nft_contract_id: AccountId }) {
        this.nft_contract_id = nft_contract_id;
        near.log(`NFT Contract Id set to ${nft_contract_id}`);
    }

    @call({ payableFunction: true })
    createEvent({
        eventId,
        title,
        eventMetadataUrl,
        eventStart,
        hostName,
        tiersInformation,
    }) {
        assert(!this.eventById.containsKey(eventId), "Event already created!");
        internalCreateEvent({
            contract: this,
            eventId,
            title,
            eventMetadataUrl,
            eventStart,
            hostName,
            tiersInformation,
        });
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
            tiers: eventMetadata.tiers,
            active: event.active,
        });
    }

    @call({ payableFunction: true })
    buyTicket({ eventId, tier = 0, amount = 1 }) {
        let accountId = near.predecessorAccountId();
        let eventMetadata = this.eventMetadataById.get(
            eventId
        ) as EventMetadata;
        let event = this.eventById.get(eventId) as Event;

        let price = eventMetadata.tiers[tier].price;

        assert(
            near.attachedDeposit() >= price,
            "Insufficient funds transferred"
        );
        assert(
            near.blockTimestamp() < BigInt(event.timestamp.valueOf()),
            "Event has already started"
        );
        assert(
            eventMetadata.tiers[tier].ticketsRemaining - amount >= 0 ||
                eventMetadata.tiers[tier].ticketsRemaining === -1,
            "Not enough tickets available"
        );

        event.amountCollected += price * amount;
        eventMetadata.tiers[tier].ticketsRemaining -= amount;

        this.eventMetadataById.set(eventId, eventMetadata);
        this.eventById.set(eventId, event);

        // mint nft on nft contract
        const promise = NearPromise.new(this.nft_contract_id).functionCall(
            "nft_mint",
            bytes(
                JSON.stringify({
                    token_id: eventId,
                    metadata: {
                        title: "NearPass #1",
                        description: "Ticket to NearPass event",
                        issuedAt: near.blockTimestamp().toString(),
                    },
                    receiverId: accountId,
                })
            ),
            BigInt(0),
            BigInt(10_000_000_000)
        );

        // create ticket from the tokenId

        let ticket = new Ticket({
            ticketId: promiseResult(0),
            accountId: accountId,
            eventId: eventId,
            tier: eventMetadata.tiers[tier],
        });

        this.ticketById.set(promiseResult(0), ticket);

        return promise.asReturn();
    }

    // cancel event before it starts and refund to all ticket buyers, only organizer should be able to cancel.
    @call({})
    cancelEvent({ eventId }) {
        let event = this.eventById.get(eventId) as Event;
        // if the event has already started, it cannot be cancelled
        assert(
            near.blockTimestamp() < BigInt(event.timestamp.valueOf()),
            "Event has already started"
        );
        // mark event as inactive.
        event.active = false;
        // mark amountCollected as zero.
        event.amountCollected = 0;

        this.eventById.set(eventId, event);
        // all ticket holders need to be refunded.
    }

    // let organizer withdraw when event ends.
    // @call
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
    claimRefund({ ticketIds }: { ticketIds: string[] }) {
        for (let i = 0; i < ticketIds.length; i++) {
            let ticketId = ticketIds[i];
            let ticket = this.ticketById.get(ticketId) as Ticket;
            assert(!ticket.used, "Ticket is used cannot refund");

            const promise = near.promiseBatchCreate(ticket.accountId);
            near.promiseBatchActionTransfer(promise, ticket.tier.price);

            ticket.redeemable = false;
            this.ticketById.set(ticketId, ticket);
        }
    }
}
