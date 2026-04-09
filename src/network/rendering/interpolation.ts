/**
 * Interpolation System for Network Entities
 * Provides smooth position interpolation between server state updates
 *
 * Server sends patches at ~20Hz (50ms interval), client renders at 60fps
 * This system interpolates positions to create smooth movement
 */

/**
 * Position snapshot from server
 */
interface PositionSnapshot {
    x: number;
    y: number;
    serverTick: number;
    timestamp: number;
}

/**
 * Interpolation data for an entity
 */
interface EntityInterpolation {
    prevSnapshot: PositionSnapshot | null;
    currSnapshot: PositionSnapshot | null;
}

/**
 * Interpolation configuration
 */
const INTERPOLATION_CONFIG = {
    // Time delay for interpolation buffer (ms)
    // We render positions from ~50ms ago to ensure we always have 2 snapshots
    BUFFER_DELAY_MS: 50,

    // Maximum distance (units) before we teleport instead of interpolate
    TELEPORT_THRESHOLD: 200,

    // Maximum age (ms) for a snapshot before it's considered stale
    SNAPSHOT_MAX_AGE_MS: 500,
};

/**
 * Interpolation System
 * Manages position interpolation for all network entities
 */
export class InterpolationSystem {
    private entities: Map<string, EntityInterpolation> = new Map();

    // Render time offset from real time (for interpolation delay)
    private renderTimeOffset: number = 0;

    // Current render time (real time - buffer delay)
    private renderTime: number = 0;

    /**
     * Initialize render time from server
     */
    initRenderTime(serverTime: number): void {
        this.renderTimeOffset = Date.now() - serverTime + INTERPOLATION_CONFIG.BUFFER_DELAY_MS;
        this.renderTime = serverTime - INTERPOLATION_CONFIG.BUFFER_DELAY_MS;
    }

    /**
     * Update render time each frame
     */
    updateRenderTime(dt: number): void {
        this.renderTime += dt;
    }

    /**
     * Get current render time
     */
    getRenderTime(): number {
        return this.renderTime;
    }

    /**
     * Push a new position snapshot for an entity
     */
    pushSnapshot(entityId: string, x: number, y: number, serverTick: number): void {
        let entity = this.entities.get(entityId);
        if (!entity) {
            entity = { prevSnapshot: null, currSnapshot: null };
            this.entities.set(entityId, entity);
        }

        const timestamp = Date.now();

        // Shift current to previous
        entity.prevSnapshot = entity.currSnapshot;

        // Set new current
        entity.currSnapshot = {
            x,
            y,
            serverTick,
            timestamp,
        };
    }

    /**
     * Get interpolated position for an entity
     * Returns the raw current position if interpolation isn't possible
     */
    getPosition(entityId: string): { x: number; y: number } | null {
        const entity = this.entities.get(entityId);
        if (!entity) return null;

        // If we don't have a current snapshot, nothing to return
        if (!entity.currSnapshot) return null;

        // If we don't have a previous snapshot, return current position (no interpolation)
        if (!entity.prevSnapshot) {
            return { x: entity.currSnapshot.x, y: entity.currSnapshot.y };
        }

        // Check if snapshots are too old (stale)
        const now = Date.now();
        if (now - entity.currSnapshot.timestamp > INTERPOLATION_CONFIG.SNAPSHOT_MAX_AGE_MS) {
            return { x: entity.currSnapshot.x, y: entity.currSnapshot.y };
        }

        // Calculate interpolation factor based on timestamps
        const prev = entity.prevSnapshot;
        const curr = entity.currSnapshot;

        const snapshotDuration = curr.timestamp - prev.timestamp;
        if (snapshotDuration <= 0) {
            return { x: curr.x, y: curr.y };
        }

        // How far into the interpolation are we?
        const elapsedSinceSnapshot = now - curr.timestamp;
        const t = Math.min(1, elapsedSinceSnapshot / snapshotDuration);

        // Check teleport threshold
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > INTERPOLATION_CONFIG.TELEPORT_THRESHOLD) {
            // Teleport: jump to current position
            return { x: curr.x, y: curr.y };
        }

        // Linear interpolation
        return {
            x: prev.x + dx * t,
            y: prev.y + dy * t,
        };
    }

    /**
     * Get interpolated position, or fallback to provided default
     */
    getPositionOrDefault(entityId: string, defaultX: number, defaultY: number): { x: number; y: number } {
        const pos = this.getPosition(entityId);
        return pos || { x: defaultX, y: defaultY };
    }

    /**
     * Check if entity has interpolation data
     */
    hasEntity(entityId: string): boolean {
        return this.entities.has(entityId);
    }

    /**
     * Remove entity interpolation data
     */
    removeEntity(entityId: string): void {
        this.entities.delete(entityId);
    }

    /**
     * Clear all interpolation data
     */
    clear(): void {
        this.entities.clear();
    }

    /**
     * Get entity count (for debugging)
     */
    getEntityCount(): number {
        return this.entities.size;
    }
}

// Singleton instance
let _interpolationSystem: InterpolationSystem | null = null;

/**
 * Get the singleton interpolation system
 */
export function getInterpolationSystem(): InterpolationSystem {
    if (!_interpolationSystem) {
        _interpolationSystem = new InterpolationSystem();
    }
    return _interpolationSystem;
}

/**
 * Reset the interpolation system (for testing or game restart)
 */
export function resetInterpolationSystem(): void {
    if (_interpolationSystem) {
        _interpolationSystem.clear();
    }
    _interpolationSystem = null;
}
