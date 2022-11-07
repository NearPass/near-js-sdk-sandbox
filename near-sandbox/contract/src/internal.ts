import { near, assert } from "near-sdk-js";
import { Event } from "./metadata";

export function internalCreateEvent({
    contract,
    eventId,
    title,
    eventMetadata,
    eventStart,
    hostName,
    price,
}) {
    // let initialStorageUsage = near.storageUsage();

    let accountId = near.predecessorAccountId();
    let event = new Event({
        title,
        timestamp: eventStart,
        active: true,
        amountCollected: 0,
        hostAccountId: accountId,
        hostName,
        price,
        eventMetadata,
        id: eventId,
    });

    contract.eventsPerOwner.set(accountId, eventId);
    contract.eventById.set(eventId, event);

    contract.numberOfEvents += 1;
    near.log(event);
    // let requiredStorageInBytes = near.storageUsage() - initialStorageUsage.valueOf();

    // refundDeposit(requiredStorageInBytes);

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
