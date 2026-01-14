/**
 * Vision Configuration for Fog of War System
 * Defines vision types, sources, and configuration constants
 */

export enum VisionType {
    NONE = 'none',           // No special vision (use basic 120px)
    OBSERVER = 'observer',   // Observer tower
    RADAR = 'radar'          // Radar tower
}

export interface VisionSource {
    x: number;
    y: number;
    radius: number;
    type: 'static' | 'radar';  // Static vision or radar sweep
}

export interface RadarSweepArea {
    x: number;
    y: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    alpha: number;  // Opacity for trail gradient
}

export const VISION_CONFIG = {
    // Basic vision radius
    headquarters: 200,       // Headquarters vision
    basicTower: 120,         // Tower basic vision

    // Observer tower config
    observer: {
        radius: { 1: 180, 2: 250, 3: 350 } as Record<number, number>,
        price: { 1: 60, 2: 120, 3: 180 } as Record<number, number>  // Cumulative: 60, 180, 360
    },

    // Radar tower config
    radar: {
        radius: { 1: 300, 2: 550, 3: 800, 4: 1050, 5: 1300 } as Record<number, number>,
        price: { 1: 100, 2: 150, 3: 200, 4: 250, 5: 300 } as Record<number, number>,  // Cumulative: 100, 250, 450, 700, 1000
        sweepAngle: Math.PI / 6,      // 30 degree sweep width
        sweepSpeed: 0.03,             // Rotation speed (rad/frame) - 1.5x faster
        revealDuration: 180,          // Temp reveal duration in frames (~3s @60fps)
        tailSegments: 6               // Trail segments (base value, adjusted by radar count)
    },

    // Fog appearance
    fogColor: { r: 40, g: 40, b: 45, a: 1.0 },  // Dark gray fog (100% opacity - fully opaque)
    edgeGradientSize: 25,            // Edge gradient pixels (used by radar towers)
    outerGradientSize: 40,           // Outer gradient width for static vision (extends beyond visible radius)
    innerGradientAlpha: 0.4,         // Inner gradient alpha for destination-out (creates 30% opacity fog at vision edge)

    // Performance: visibility grid
    visibilityGridCellSize: 25,      // Grid cell size (px) - smaller = better edge precision

    // Vision fade timing
    visionFadeDelay: 30,             // Frames before vision starts fading (~0.5s)
    visionFadeDuration: 60           // Fade duration in frames (~1s)
};
