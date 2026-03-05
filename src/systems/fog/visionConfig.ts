/**
 * Vision Configuration for Fog of War System
 * Shared constants are imported from shared/config/visionMeta.ts.
 * This file retains client-only rendering params and re-exports shared types.
 */

// Re-export shared types and constants for backward compatibility
export { VisionType } from '../../../shared/config/visionMeta.js';
export type { VisionSource, RadarSweepArea };

import {
    HEADQUARTERS_VISION, BASIC_TOWER_VISION,
    OBSERVER_RADIUS, OBSERVER_PRICE,
    RADAR_RADIUS, RADAR_PRICE,
    RADAR_SWEEP_ANGLE, RADAR_SWEEP_SPEED,
} from '../../../shared/config/visionMeta.js';

interface VisionSource {
    x: number;
    y: number;
    radius: number;
    type: 'static' | 'radar';
}

interface RadarSweepArea {
    x: number;
    y: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    alpha: number;
}

export const VISION_CONFIG = {
    // Basic vision radius (from shared)
    headquarters: HEADQUARTERS_VISION,
    basicTower: BASIC_TOWER_VISION,

    // Observer tower config (from shared)
    observer: {
        radius: OBSERVER_RADIUS,
        price: OBSERVER_PRICE,
    },

    // Radar tower config (from shared)
    radar: {
        radius: RADAR_RADIUS,
        price: RADAR_PRICE,
        sweepAngle: RADAR_SWEEP_ANGLE,
        sweepSpeed: RADAR_SWEEP_SPEED,
        revealDuration: 180,
        tailSegments: 6,
    },

    // Client-only: fog appearance
    fogColor: { r: 40, g: 40, b: 45, a: 1.0 },
    edgeGradientRatio: 0.15,
    outerGradientSize: 80,
    innerEdgeFogOpacity: 0.25,

    // Client-only: performance
    visibilityGridCellSize: 25,

    // Client-only: vision fade timing
    visionFadeDelay: 30,
    visionFadeDuration: 60,
};
