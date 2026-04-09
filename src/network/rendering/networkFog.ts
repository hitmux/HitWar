/**
 * NetworkFogProxy - Client-side fog of war for multiplayer mode
 * Bridges NetworkWorldAdapter data to FogOfWar + FogRenderer via WorldLike adapter.
 * Reuses ~500 lines of existing fog rendering code.
 */

import { FogOfWar } from '../../systems/fog/fogOfWar';
import type { WorldLike, TowerLike } from '../../systems/fog/fogOfWar';
import type { TowerRenderProxy } from './renderProxy';
import type { BuildingRenderProxy } from './renderProxy';
import type { Camera } from '../../core/camera';

/**
 * Adapts NetworkWorldAdapter data for FogOfWar consumption.
 * Implements WorldRendererContext.fog interface.
 */
export class NetworkFogProxy {
    private _fog: FogOfWar;
    private _worldAdapter: WorldLikeAdapter;

    readonly enabled: boolean = true;

    constructor(
        localPlayerId: string,
        camera: Camera,
        mapWidth: number,
        mapHeight: number,
        viewWidth: number,
        viewHeight: number,
    ) {
        this._worldAdapter = new WorldLikeAdapter(
            camera, mapWidth, mapHeight, viewWidth, viewHeight
        );
        this._fog = new FogOfWar(this._worldAdapter, localPlayerId);
    }

    /** FogRenderer instance (for WorldRendererContext.fog.renderer) */
    get renderer() {
        return this._fog.renderer;
    }

    /** Underlying FogOfWar instance (for Worker rendering initialization) */
    get fog() {
        return this._fog;
    }

    /** Check if a circle is visible through fog */
    isCircleVisible(x: number, y: number, radius: number): boolean {
        return this._fog.isCircleVisible(x, y, radius);
    }

    /**
     * Update fog state. Must be called per frame.
     * Sets tower/building data and recalculates vision sources.
     */
    update(towers: TowerRenderProxy[], buildings: BuildingRenderProxy[]): void {
        // Update tower references (FogOfWar reads from world.batterys)
        this._worldAdapter.setBatterys(towers);
        this._worldAdapter.setBaseBuilding(buildings);
        this._fog.update();
    }

    /** Resize viewport */
    resize(viewWidth: number, viewHeight: number): void {
        this._worldAdapter.viewWidth = viewWidth;
        this._worldAdapter.viewHeight = viewHeight;
    }
}

/**
 * Lightweight WorldLike adapter for FogOfWar.
 * Provides camera, dimensions, and tower/building data from NetworkWorldAdapter.
 */
class WorldLikeAdapter implements WorldLike {
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;
    camera: Camera;
    batterys: TowerLike[] = [];
    territory = undefined;

    private _basePos = { pos: { x: 0, y: 0 } };
    private _buildings: BuildingRenderProxy[] = [];

    constructor(
        camera: Camera,
        mapWidth: number,
        mapHeight: number,
        viewWidth: number,
        viewHeight: number,
    ) {
        this.camera = camera;
        this.width = mapWidth;
        this.height = mapHeight;
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
    }

    setBatterys(towers: TowerLike[]): void {
        this.batterys = towers;
    }

    setBaseBuilding(buildings: BuildingRenderProxy[]): void {
        this._buildings = buildings;
    }

    getBaseBuilding(playerId?: string): { pos: { x: number; y: number } } {
        // Find player's base building
        for (const b of this._buildings) {
            if (b.isBase && (!playerId || b.ownerId === playerId)) {
                this._basePos.pos.x = b.pos.x;
                this._basePos.pos.y = b.pos.y;
                return this._basePos;
            }
        }
        // Fallback to map center
        this._basePos.pos.x = this.width / 2;
        this._basePos.pos.y = this.height / 2;
        return this._basePos;
    }
}
