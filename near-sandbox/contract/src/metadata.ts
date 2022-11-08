import { assert, UnorderedMap, UnorderedSet } from "near-sdk-js";
import { AccountId } from "near-sdk-js/lib/types";

export type EventId = string;

export enum EventType {
    "virtual",
    "irl",
}

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
    name: string;
    email: string;
    phone: string;
    answer1: string;
    answer2: string;

    constructor({
        ticketId,
        eventId,
        accountId,
        name,
        email,
        phone,
        answer1,
        answer2,
    }) {
        this.ticketId = ticketId;
        this.eventId = eventId;
        this.accountId = accountId;
        this.used = false;
        this.redeemable = false;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.answer1 = answer1;
        this.answer2 = answer2;
    }
}

export class EventMetadata {
    eventType: EventType;
    venue: string;
    hostemail: string;
    telegram: string;
    discord: string;
    faqquestion1: string;
    faqquestion2: string;
    answer1: string;
    answer2: string;
    question1: string;
    question2: string;
    thumbnail: string;
    description: string;

    constructor({
        eventType,
        venue,
        hostemail,
        telegram,
        discord,
        faqquestion1,
        faqquestion2,
        answer1,
        answer2,
        question1,
        question2,
        thumbnail,
        description,
    }) {
        this.eventType = eventType;
        this.venue = venue;
        this.hostemail = hostemail;
        this.telegram = telegram;
        this.discord = discord;
        this.faqquestion1 = faqquestion1;
        this.faqquestion2 = faqquestion2;
        this.answer1 = answer1;
        this.answer2 = answer2;
        this.question1 = question1;
        this.question2 = question2;
        this.thumbnail = thumbnail;
        this.description = description;
    }
}

export class Event {
    id: string;
    title: string;
    active: boolean;
    timestamp: number;
    amountCollected: number;
    host: Host;
    price: number;
    eventMetadata: EventMetadata;

    constructor({
        title,
        id,
        active,
        timestamp,
        amountCollected,
        hostName,
        hostAccountId,
        price,
        eventMetadata,
    }) {
        this.title = title;
        this.active = active;
        this.timestamp = timestamp;
        this.host = new Host({
            name: hostName,
            accountId: hostAccountId,
        });
        this.amountCollected = amountCollected;
        this.price = price;
        this.eventMetadata = new EventMetadata(eventMetadata);
        this.id = id;
    }
}
