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
} from "near-sdk-js";
import { internalCreateEvent } from "./internal";
import { Event, EventId, EventMetadata } from "./metadata";

const FIVE_TGAS = BigInt("50000000000000");

@NearBindgen({})
export class Events {
    owner_id: string = "";
    numberOfEvents: number = 0;
    eventsPerOwner = new LookupMap("eventsPerOwner");
    eventMetadataById = new UnorderedMap("eventsMetadata");
    eventById = new LookupMap("eventById");

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
        return this.eventMetadataById.get(eventId);
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
        // const promise = NearPromise.new("nft_contract_accountId").functionCall(
        //     "nft_mint",
        //     bytes(
        //         JSON.stringify({
        //             token_id: "eventId",
        //             metadata: "something",
        //             receiverId: accountId,
        //         })
        //     ),
        //     BigInt(0),
        //     FIVE_TGAS
        // );
    }

    // cancel event before it starts and refund to all ticket buyers, only organizer should be able to cancel.
    // @call
    // cancelEvent({ eventId });

    // let organizer withdraw when event ends.
    // @call
    // withdraw({ eventId });
}
