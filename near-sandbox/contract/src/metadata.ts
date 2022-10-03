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

export class Event {
    title: string;
    active: boolean;
    timestamp: number;
    amountCollected: number;

    constructor({ title, active, timestamp, amountCollected }) {
        this.title = title;
        this.active = active;
        this.timestamp = timestamp;
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
    host: Host;
    tiers: Tier[];

    constructor({
        title,
        eventMetadata,
        hostName,
        hostAccountId,
        tiersInformation,
    }) {
        this.title = title;
        this.eventMetadata = eventMetadata;
        this.host = new Host({ name: hostName, accountId: hostAccountId });
        this.tiers = new Array(new Tier(tiersInformation));
    }
}
