import { AccountId } from "near-sdk-js/lib/types";

type isTiered<P, U> = P extends { [key: string]: any } & { tiers: Tier[] }
    ? never
    : U;
export type EventId = string;
export class Host {
    name: string;
    accountId: AccountId;
    email?: string;
}

export class Tier {
    price: number;
    ticketGraphic: string;
    cap: number;
}

export class Event {
    eventId: EventId;
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
     * }
     */
    eventMetadata: string;
    maxTickets?: isTiered<this, number>;
    venue: string;
    date: Date;
    time: string;
    host: Host;
    tiers?: Tier[];
    price: isTiered<this, number>;
    // at this link on the ticketGraphic should be host
    ticketGraphic: isTiered<this, string>;

    constructor({ eventId, title, eventMetadata, venue, date, time, price }) {
        this.eventId = eventId;
        this.title = title;
        this.eventMetadata = eventMetadata;
        this.venue = venue;
        this.date = date;
        this.time = time;
        this.price = price;
    }
}

let event: Event = new Event({
    eventId: "some-event",
    title: "Very good event",
    eventMetadata: "https://www.google.com",
    venue: "Mumbai, India",
    date: new Date(),
    time: "12:00",
    price: 10,
});

event.tiers = [{ price: 10, ticketGraphic: "some_image_url", cap: 10 }];
event.maxTickets = 10;
