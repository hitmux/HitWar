/**
 * Multiplayer World Facade
 * Wraps NetworkWorldAdapter to provide a World-like interface for PanelManager
 */

import type { NetworkWorldAdapter } from '../../../network/rendering/networkWorldAdapter';
import type { NetworkClient } from '../../../network/networkClient';
import type { Camera } from '../../../core/camera';
import type { IEffect } from '../../../types/game';
import type { GameEntity, PanelManagerWorldLike, PanelManagerTerritory, PanelManagerFog } from './types';

/**
 * Facade class that bridges NetworkWorldAdapter to World-like interface
 * Required by PanelManager which expects a World instance
 */
export class MultiplayerWorldFacade implements PanelManagerWorldLike {
    private _adapter: NetworkWorldAdapter;
    private _networkClient: NetworkClient;

    constructor(adapter: NetworkWorldAdapter, networkClient: NetworkClient) {
        this._adapter = adapter;
        this._networkClient = networkClient;
    }

    // === Camera Access ===

    get camera(): Camera {
        return this._adapter.camera;
    }

    // === World Dimensions ===

    get width(): number {
        return this._adapter.getRendererContext().width;
    }

    get height(): number {
        return this._adapter.getRendererContext().height;
    }

    // === Entity Collections ===

    /**
     * Get all buildings (towers + buildings) for panel display
     */
    getAllBuildingArr(): GameEntity[] {
        const ctx = this._adapter.getRendererContext();
        // Combine towers and buildings as GameEntity-compatible objects
        const result: GameEntity[] = [];

        for (const tower of ctx.batterys) {
            result.push(tower as unknown as GameEntity);
        }

        for (const building of ctx.buildings) {
            result.push(building as unknown as GameEntity);
        }

        return result;
    }

    /**
     * Get all towers
     */
    get batterys(): unknown[] {
        return this._adapter.getRendererContext().batterys;
    }

    /**
     * Get all buildings
     */
    get buildings(): unknown[] {
        return this._adapter.getRendererContext().buildings;
    }

    /**
     * Get all monsters
     */
    get monsters(): Set<unknown> {
        return this._adapter.getRendererContext().monsters;
    }

    // === Money Operations (Read-only in multiplayer) ===

    getMoney(): number {
        return this._adapter.getRendererContext().user.money;
    }

    /**
     * Spend money - sends request to server, returns false (server validates)
     */
    spendMoney(_amount: number): boolean {
        // In multiplayer mode, money operations are validated by server
        // Return false to indicate local operation not permitted
        return false;
    }

    /**
     * Add money - no-op in multiplayer (server controls)
     */
    addMoney(_amount: number): void {
        // No-op: server controls money
    }

    /**
     * Set money - no-op in multiplayer (server controls)
     */
    setMoney(_amount: number): void {
        // No-op: server controls money
    }

    // === Effects ===

    /**
     * Add local visual effect
     * Note: In multiplayer mode, effects are handled differently through LocalEffectsManager
     * This method is a no-op as effects are generated from server events
     */
    addEffect(_effect: IEffect): void {
        // In multiplayer mode, visual effects are generated from server events
        // via NetworkWorldAdapter.bindEventHandlers()
        // PanelManager may call this but effects are handled differently
    }

    // === Tower Operations (via NetworkClient) ===

    /**
     * Request building a tower (sends to server)
     */
    addTower(towerConfig: { towerType: string; pos: { x: number; y: number } }): void {
        this._networkClient.buildTower({
            towerType: towerConfig.towerType,
            x: towerConfig.pos.x,
            y: towerConfig.pos.y
        });
    }

    /**
     * Request selling a tower (sends to server)
     */
    sellTower(towerId: string): void {
        this._networkClient.sellTower({ towerId });
    }

    /**
     * Request upgrading a tower (sends to server)
     * Note: UpgradeTowerPayload only takes towerId, upgrade type is handled differently
     */
    upgradeTower(towerId: string, _upgradeType?: string): void {
        this._networkClient.upgradeTower({ towerId });
    }

    // === User State ===

    /**
     * User state object for rendering previews
     */
    get user() {
        return this._adapter.getRendererContext().user;
    }

    // === Territory/Fog (disabled in multiplayer for now) ===

    get territory(): PanelManagerTerritory | null {
        const t = this._adapter.getRendererContext().territory;
        if (!t) return null;
        // Return a wrapper that satisfies PanelManagerTerritory
        // In multiplayer, territory operations are no-ops
        return {
            isPositionInValidTerritory: () => true, // Allow building anywhere in multiplayer
            markDirty: () => {},
            removeBuildingIncremental: () => {},
            addBuildingIncremental: () => {}
        };
    }

    get fog(): PanelManagerFog | null {
        const f = this._adapter.getRendererContext().fog;
        if (!f) return null;
        // Return a wrapper that satisfies PanelManagerFog
        return {
            markDirty: () => {}
        };
    }

    // === Obstacles ===

    get obstacles(): Array<{ intersectsCircle(circle: unknown): boolean }> {
        return this._adapter.getRendererContext().obstacles as Array<{ intersectsCircle(circle: unknown): boolean }>;
    }

    // === Mines (not synced in network mode) ===

    get mines(): Set<unknown> {
        return this._adapter.getRendererContext().mines;
    }

    // === Base Building ===

    /**
     * Get local player's base building
     */
    getBaseBuilding(): unknown {
        const buildings = this._adapter.getRendererContext().buildings;
        // Find the base building owned by local player
        for (const building of buildings) {
            const b = building as { gameType?: string; ownerId?: string };
            if (b.gameType === 'Base') {
                return building;
            }
        }
        // Fallback to first building
        return buildings[0] ?? null;
    }

    // === Game State ===

    get haveFlow(): boolean {
        return true; // Multiplayer always has waves
    }

    get mode(): string {
        return 'multiplayer';
    }

    // === Adapter Access ===

    get adapter(): NetworkWorldAdapter {
        return this._adapter;
    }

    get networkClient(): NetworkClient {
        return this._networkClient;
    }

    // === Building Operations ===

    /**
     * Add building - sends request to server
     * Note: In multiplayer, building placement is validated by server
     */
    addBuilding(_building: unknown): void {
        // In multiplayer mode, building operations would be sent to server
        // For now, this is a no-op as building placement logic differs
        console.log('[MultiplayerWorldFacade] addBuilding called - not implemented for multiplayer');
    }

    // === Static Layer ===

    /**
     * Mark static layer dirty - no-op in multiplayer
     * In multiplayer, rendering is handled by NetworkWorldAdapter
     */
    markStaticLayerDirty(): void {
        // No-op: NetworkWorldAdapter handles rendering updates
    }
}
