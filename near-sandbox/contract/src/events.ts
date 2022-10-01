//@ts-nocheck
import {
    near,
    assert,
    call,
    NearBindgen,
    view,
    LookupMap,
    UnorderedSet,
} from "near-sdk-js";
import { AccountId } from "near-sdk-js/lib/types";
import { Event, EventId } from "./metadata";

@NearBindgen({})
export class Events {
    owner_id: string = "";
    numberOfEvents: number = 0;
    eventsPerOwner: LookupMap<AccountId, UnorderedSet<EventId>> = new LookupMap(
        "events-per-owner"
    );
    eventMetadataById: LookupMap<EventId, Event> = new LookupMap(
        "events-metadata"
    );

    @call
    createEvent({ eventId, event }) {
        internalCreateEvent(eventId, event);
    }

    @view
    getEvent({ eventId }) {
        return this.eventMetadataById.get(eventId);
    }
}
