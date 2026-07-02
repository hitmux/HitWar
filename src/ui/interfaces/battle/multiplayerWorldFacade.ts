/**
 * Multiplayer World Facade
 * Wraps NetworkWorldAdapter to provide a World-like interface for PanelManager
 */

import type { NetworkWorldAdapter } from '../../../network/rendering/networkWorldAdapter';
import type { NetworkClient } from '../../../network/networkClient';
import type { Camera } from '../../../core/camera';
import type { Vector } from '../../../core/math/vector';
import type { IEffect } from '../../../types/game';
import type { GameEntity, PanelManagerWorldLike, PanelManagerTerritory, PanelManagerFog } from './types';
import { getTowerCombatData } from '@shared/config/towerCombatMeta';
import { getBuildingMeta } from '@shared/config/buildingMeta';

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
     * Request building a tower (sends to server with client prediction)
     */
    addTower(towerConfig: { towerType: string; pos: { x: number; y: number } }): void {
        // Immediate ghost tower feedback
        const combatMeta = getTowerCombatData(towerConfig.towerType);
        const requestId = this._adapter.prediction.predictBuild(
            towerConfig.towerType,
            towerConfig.pos.x,
            towerConfig.pos.y,
            combatMeta?.radius ?? 15,
            combatMeta?.attackRadius ?? 200
        );

        // Send to server with requestId for precise rejection matching
        this._networkClient.buildTower({
            towerType: towerConfig.towerType,
            x: towerConfig.pos.x,
            y: towerConfig.pos.y,
            requestId
        });
    }

    /**
     * Request selling a tower (sends to server with client prediction)
     */
    sellTower(towerId: string): void {
        const requestId = this._adapter.prediction.predictSell(towerId);
        this._networkClient.sellTower({ towerId, requestId });
    }

    /**
     * Request upgrading a tower (sends to server)
     * Note: UpgradeTowerPayload only takes towerId, upgrade type is handled differently
     */
    upgradeTower(towerId: string, upgradeType: string): void {
        this._networkClient.upgradeTower({ towerId, targetType: upgradeType });
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
        // Use the real local player territory for position validation
        const localTerritory = this._adapter.getLocalTerritory();
        if (!localTerritory) return null;
        return {
            isPositionInValidTerritory: (pos: Vector) => localTerritory.isPositionInValidTerritory(pos),
            // Territory mutations are server-authoritative in multiplayer; no-op on client
            markDirty: () => {},
            removeBuildingIncremental: () => {},
            addBuildingIncremental: () => {},
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

    // === Mine Operations (via NetworkClient) ===

    upgradeMine(mineId: string): void {
        this._networkClient.upgradeMine({ mineId });
    }

    repairMine(mineId: string): void {
        this._networkClient.repairMine({ mineId });
    }

    downgradeMine(mineId: string): void {
        this._networkClient.downgradeMine({ mineId });
    }

    sellMine(mineId: string): void {
        this._networkClient.sellMine({ mineId });
    }

    // === Base Building ===

    /**
     * Get local player's base building
     * 使用 isBase 属性识别基地建筑，找不到时返回 null
     */
    getBaseBuilding(): unknown {
        const buildings = this._adapter.getRendererContext().buildings;
        const localPlayerId = this._adapter.localPlayerId;
        // 遍历建筑查找本地玩家的基地
        for (const building of buildings) {
            const b = building as { isBase?: boolean; ownerId?: string };
            if (b.isBase && b.ownerId === localPlayerId) {
                return building;
            }
        }
        // 未找到基地时返回 null，避免返回非基地建筑
        return null;
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
    addBuilding(building: { buildingType: string; pos: { x: number; y: number } }): void {
        const meta = getBuildingMeta(building.buildingType);
        if (!meta) return;

        const requestId = this._adapter.prediction.predictBuild(
            building.buildingType,
            building.pos.x,
            building.pos.y,
            meta.radius,
            0
        );

        this._networkClient.buildBuilding({
            buildingType: building.buildingType,
            x: building.pos.x,
            y: building.pos.y,
            requestId
        });
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
