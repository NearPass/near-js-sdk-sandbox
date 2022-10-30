import { assert, UnorderedMap, UnorderedSet } from "near-sdk-js";
import { AccountId } from "near-sdk-js/lib/types";

export type EventId = string;

export class Host {
    name: string;
    accountId: AccountId;

    constructor({ name, accountId }) {
        this.name = name;
        this.accountId = accountId;
    }
}

export class Ticket {
    ticketId: string; // tokenId returned from NFT contract;
    eventId: string;
    accountId: AccountId; // owner of ticket
    used: boolean; // true means the ticket owner attended the event
    redeemable: boolean; // whether the owner can claim the price in case the event gets cancelled.

    constructor({ ticketId, eventId, accountId }) {
        this.ticketId = ticketId;
        this.eventId = eventId;
        this.accountId = accountId;
        this.used = false;
        this.redeemable = false;
    }
}

export class Event {
    title: string;
    active: boolean;
    timestamp: number;
    amountCollected: number;
    host: Host;
    price: number;
    tickets: UnorderedSet;

    constructor({
        title,
        active,
        timestamp,
        amountCollected,
        hostName,
        hostAccountId,
        price,
    }) {
        this.title = title;
        this.active = active;
        this.timestamp = timestamp;
        this.host = new Host({ name: hostName, accountId: hostAccountId });
        this.amountCollected = amountCollected;
        this.tickets = new UnorderedSet(title);
        this.price = price;
    }
}

export class EventMetadata {
    title: string;
    /**
     * at the below URL location following should be stored
     * {
     *      longDescription
     *      shortDescription
     *      extraQuestions (to be asked to user)
     *      FAQ (questions answered by the organizer)
     *      Partner Info
     *      Telegram Group Handle/Invite Link for the event
     *
     *      StartDate
     *      StartTime
     *      EndDate
     *      EndTime
     *
     *
     *      Venue
     * }
     */
    eventMetadata: string;

    constructor({ title, eventMetadata }) {
        this.title = title;
        this.eventMetadata = eventMetadata;
    }
}
