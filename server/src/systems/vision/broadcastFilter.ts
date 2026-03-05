/**
 * Broadcast Filter Utilities
 * Send messages only to players who can see the relevant position.
 */

import type { Room, Client } from '@colyseus/core';
import type { VisionSystem } from './visionSystem.js';

/**
 * Send a message only to clients who can see the given position.
 * Falls back to broadcast if visionSystem is not available.
 */
export function sendToVisible(
    room: Room,
    visionSystem: VisionSystem | null,
    messageType: string,
    payload: unknown,
    x: number,
    y: number,
): void {
    if (!visionSystem) {
        room.broadcast(messageType, payload);
        return;
    }

    room.clients.forEach((client: Client) => {
        if (visionSystem.isPositionVisible(client.sessionId, x, y)) {
            client.send(messageType, payload);
        }
    });
}

/**
 * Send a message to the entity owner (always) and other clients who can see the position.
 * Used for events like MONSTER_KILLED where the owner needs the kill credit info.
 */
export function sendToEntityOwnerAndVisible(
    room: Room,
    visionSystem: VisionSystem | null,
    messageType: string,
    payload: unknown,
    entityOwnerId: string | null,
    x: number,
    y: number,
): void {
    if (!visionSystem) {
        room.broadcast(messageType, payload);
        return;
    }

    room.clients.forEach((client: Client) => {
        if (client.sessionId === entityOwnerId ||
            visionSystem.isPositionVisible(client.sessionId, x, y)) {
            client.send(messageType, payload);
        }
    });
}
