import { near, assert } from "near-sdk-js";
import { Event, EventMetadata } from "./metadata";

export function internalCreateEvent({
    contract,
    eventId,
    title,
    eventMetadataUrl,
    eventStart,
    hostName,
    tiersInformation,
}) {
    let initialStorageUsage = near.storageUsage();

    let accountId = near.predecessorAccountId();
    let event = new Event({
        title,
        timestamp: eventStart,
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

    near.log(eventMetadata.tiers);

    contract.eventsPerOwner.set(accountId, eventId);
    contract.eventMetadataById.set(eventId, eventMetadata);
    contract.eventById.set(eventId, event);

    contract.numberOfEvents += 1;
    near.log(`Event Created: ${accountId} created ${title} event`);

    let requiredStorageInBytes =
        near.storageUsage() - initialStorageUsage.valueOf();

    refundDeposit(requiredStorageInBytes);

    return eventId;
}

export function refundDeposit(storageUsed: bigint) {
    let requiredCost = storageUsed * near.storageByteCost().valueOf();
    let attachedDeposit = near.attachedDeposit().valueOf();

    assert(
        attachedDeposit >= requiredCost,
        `Must attach ${requiredCost} yoctoNear to cover storage`
    );

    let refund = attachedDeposit - requiredCost;
    near.log(`Refunded ${refund} yoctoNear`);

    if (refund > 1) {
        const promise = near.promiseBatchCreate(near.predecessorAccountId());
        near.promiseBatchActionTransfer(promise, refund);
    }
}
