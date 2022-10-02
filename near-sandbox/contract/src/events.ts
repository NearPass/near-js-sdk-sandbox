import {
    assert,
    call,
    NearBindgen,
    view,
    LookupMap,
    UnorderedMap,
} from "near-sdk-js";
import { internalCreateEvent } from "./internal";

@NearBindgen({})
export class Events {
    owner_id: string = "";
    numberOfEvents: number = 0;
    eventsPerOwner = new LookupMap("eventsPerOwner");
    eventMetadataById = new UnorderedMap("eventsMetadata");
    eventById = new LookupMap("eventById");

    @call({})
    createEvent({
        eventId,
        title,
        eventMetadataUrl,
        hostName,
        tiersInformation,
    }) {
        assert(!this.eventById.containsKey(eventId), "Event already created!");
        internalCreateEvent({
            contract: this,
            eventId,
            title,
            eventMetadataUrl,
            hostName,
            tiersInformation,
        });
    }

    @view({})
    getEvent({ eventId }) {
        return this.eventMetadataById.get(eventId);
    }

    // @call({ payableFunction: true })
    // buyTicket({ eventId }) {}

    // cancel event before it starts and refund to all ticket buyers, only organizer should be able to cancel.
    // @call
    // cancelEvent({ eventId });

    // let organizer withdraw when event ends.
    // @call
    // withdraw({ eventId });
}
