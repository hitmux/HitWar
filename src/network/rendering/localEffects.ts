/**
 * Local Effects Manager
 * Manages client-side visual effects based on server events
 *
 * Effects include:
 * - Bullet flight animations (local prediction)
 * - Hit/explosion effects
 * - Damage indicators
 * - Death effects
 */

import { EffectCircle } from '../../effects/effectCircle';
import { BulletRenderProxy } from './renderProxy';
import type { IEffect } from '../../types/game';

/**
 * Effect types for different game events
 */
export type LocalEffectType =
    | 'bullet_hit'
    | 'monster_death'
    | 'building_damage'
    | 'building_destroy'
    | 'tower_attack';

/**
 * Configuration for different effect types
 */
interface EffectConfig {
    radius: number;
    duration: number;
    animation: keyof EffectCircle;
}

const EFFECT_CONFIGS: Record<LocalEffectType, EffectConfig> = {
    bullet_hit: { radius: 15, duration: 8, animation: 'flashFireAnimation' },
    monster_death: { radius: 25, duration: 12, animation: 'flashRedAnimation' },
    building_damage: { radius: 10, duration: 6, animation: 'flashRedAnimation' },
    building_destroy: { radius: 40, duration: 20, animation: 'destroyAnimation' },
    tower_attack: { radius: 10, duration: 5, animation: 'flashBlueAnimation' },
};

/**
 * Local Effects Manager
 * Handles creation and lifecycle of client-side visual effects
 */
export class LocalEffectsManager {
    // Active effects
    private _effects: Set<IEffect> = new Set();

    // Local bullets for attack visualization
    private _localBullets: Set<BulletRenderProxy> = new Set();

    // Pending effects to add (batched for performance)
    private _pendingEffects: { type: LocalEffectType; x: number; y: number }[] = [];

    // Frame counter for effect timing
    private _frameCount: number = 0;

    /**
     * Get active effects set
     */
    get effects(): Set<IEffect> {
        return this._effects;
    }

    /**
     * Get local bullets set
     */
    get localBullets(): Set<BulletRenderProxy> {
        return this._localBullets;
    }

    /**
     * Create an effect at position
     */
    createEffect(type: LocalEffectType, x: number, y: number): void {
        const config = EFFECT_CONFIGS[type];
        const effect = EffectCircle.acquire({ x, y });

        effect.circle.r = config.radius;
        effect.duration = config.duration;
        effect.animationFunc = (effect as unknown as Record<string, () => void>)[config.animation];

        this._effects.add(effect);
    }

    /**
     * Queue effect for batch processing
     */
    queueEffect(type: LocalEffectType, x: number, y: number): void {
        this._pendingEffects.push({ type, x, y });
    }

    /**
     * Create local bullet for attack visualization
     */
    createLocalBullet(
        startX: number,
        startY: number,
        targetX: number,
        targetY: number,
        radius: number = 5,
        speed: number = 15
    ): BulletRenderProxy {
        const bullet = new BulletRenderProxy(startX, startY, targetX, targetY, radius, speed);
        this._localBullets.add(bullet);
        return bullet;
    }

    /**
     * Handle tower attack event
     * Creates local bullet + muzzle flash effect
     */
    onTowerAttack(
        towerX: number,
        towerY: number,
        targetX: number,
        targetY: number,
        bulletRadius: number = 5,
        bulletSpeed: number = 15
    ): void {
        // Muzzle flash
        this.createEffect('tower_attack', towerX, towerY);

        // Local bullet
        this.createLocalBullet(towerX, towerY, targetX, targetY, bulletRadius, bulletSpeed);
    }

    /**
     * Handle monster damaged event
     */
    onMonsterDamaged(x: number, y: number, _damage: number): void {
        // Small hit effect
        this.createEffect('bullet_hit', x, y);
    }

    /**
     * Handle monster killed event
     */
    onMonsterKilled(x: number, y: number): void {
        this.createEffect('monster_death', x, y);
    }

    /**
     * Handle building damaged event
     */
    onBuildingDamaged(x: number, y: number, _damage: number): void {
        this.createEffect('building_damage', x, y);
    }

    /**
     * Handle building destroyed event
     */
    onBuildingDestroyed(x: number, y: number): void {
        this.createEffect('building_destroy', x, y);
    }

    /**
     * Update all effects (called each frame)
     */
    update(): void {
        this._frameCount++;

        // Process pending effects
        for (const pending of this._pendingEffects) {
            this.createEffect(pending.type, pending.x, pending.y);
        }
        this._pendingEffects.length = 0;

        // Update and cleanup effects
        for (const effect of this._effects) {
            effect.goStep();
            if (!effect.isPlay) {
                this._effects.delete(effect);
                // Return to pool if it's an EffectCircle
                if (effect instanceof EffectCircle) {
                    EffectCircle.release(effect);
                }
            }
        }

        // Update and cleanup local bullets
        for (const bullet of this._localBullets) {
            bullet.goStep();
            if (bullet.isExpired) {
                // Create hit effect at bullet destination
                this.createEffect('bullet_hit', bullet.pos.x, bullet.pos.y);
                this._localBullets.delete(bullet);
            }
        }
    }

    /**
     * Clear all effects
     */
    clear(): void {
        // Return all effects to pool
        for (const effect of this._effects) {
            if (effect instanceof EffectCircle) {
                EffectCircle.release(effect);
            }
        }
        this._effects.clear();
        this._localBullets.clear();
        this._pendingEffects.length = 0;
    }

    /**
     * Get effect count (for debugging)
     */
    getEffectCount(): number {
        return this._effects.size;
    }

    /**
     * Get bullet count (for debugging)
     */
    getBulletCount(): number {
        return this._localBullets.size;
    }
}

// Singleton instance
let _localEffectsManager: LocalEffectsManager | null = null;

/**
 * Get the singleton local effects manager
 */
export function getLocalEffectsManager(): LocalEffectsManager {
    if (!_localEffectsManager) {
        _localEffectsManager = new LocalEffectsManager();
    }
    return _localEffectsManager;
}

/**
 * Reset the local effects manager
 */
export function resetLocalEffectsManager(): void {
    if (_localEffectsManager) {
        _localEffectsManager.clear();
    }
    _localEffectsManager = null;
}
