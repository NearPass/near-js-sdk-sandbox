import { near } from "near-sdk-js";
import { Event, EventMetadata } from "./metadata";

export function internalCreateEvent({
    contract,
    eventId,
    title,
    eventMetadataUrl,
    hostName,
    tiersInformation,
}) {
    let accountId = near.predecessorAccountId();
    let event = new Event({
        title,
        timestamp: near.blockTimestamp().toString(),
        active: true,
        amountCollected: 0,
    });

    let eventMetadata = new EventMetadata({
        eventMetadata: eventMetadataUrl,
        title,
        hostAccountId: accountId,
        hostName,
        tiersInformation,
    });

    contract.eventsPerOwner.set(accountId, eventId);
    contract.eventMetadataById.set(eventId, eventMetadata);
    contract.eventById.set(eventId, event);

    contract.numberOfEvents += 1;
    near.log(`Event Created: ${accountId} created ${title} event`);
    return eventId;
}
