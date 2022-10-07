import { assert } from "near-sdk-js";
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

export class Tier {
    price: number;
    thumbnail: string;
    ticketsRemaining: number; // -1 for infinite

    constructor({ price, thumbnail, ticketsRemaining }) {
        this.price = price;
        this.thumbnail = thumbnail;
        this.ticketsRemaining = ticketsRemaining;
    }
}

export class Ticket {
    ticketId: string; // tokenId returned from NFT contract;
    eventId: string;
    accountId: AccountId; // owner of ticket
    used: boolean; // true means the ticket owner attended the event
    redeemable: boolean; // whether the owner can claim the price in case the event gets cancelled.
    tier: Tier;

    constructor({ ticketId, eventId, accountId, tier }) {
        this.ticketId = ticketId;
        this.eventId = eventId;
        this.accountId = accountId;
        this.tier = tier;
        this.used = false;
        this.redeemable = true;
    }
}

export class Event {
    title: string;
    active: boolean;
    timestamp: number;
    amountCollected: number;
    host: Host;

    constructor({
        title,
        active,
        timestamp,
        amountCollected,
        hostName,
        hostAccountId,
    }) {
        this.title = title;
        this.active = active;
        this.timestamp = timestamp;
        this.host = new Host({ name: hostName, accountId: hostAccountId });
        this.amountCollected = amountCollected;
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
    tiers: Tier[];

    constructor({ title, eventMetadata, tiersInformation }) {
        this.title = title;
        this.eventMetadata = eventMetadata;
        let tiers = new Array(tiersInformation.length);
        for (let i = 0; i < tiers.length; i++) {
            tiers[i] = new Tier(tiersInformation[i]);
        }
        this.tiers = tiers;
    }
}
