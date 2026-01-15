/**
 * SaveManager - Handles serialization, deserialization, and storage operations
 *
 * Uses Registry pattern for tower/monster/building lookups
 */

import { Vector } from '../../core/math/vector';
import { TowerRegistry } from '../../towers/towerRegistry';
import { MonsterRegistry } from '../../monsters/monsterRegistry';
import { BuildingRegistry } from '../../buildings/buildingRegistry';
import { Obstacle } from '../../core/physics/obstacle';
import { Mine } from '../energy/mine';

export const SAVE_VERSION = 4;
export const SAVE_KEY_PREFIX = "HitWar_save_";

// Type definitions for save data
interface WorldData {
    time: number;
    money: number;
    flowLevel: number;
    flowDelayTick: number;
    flowState: string;
    width: number;
    height: number;
    gameSpeed?: number;
}

interface CameraData {
    x: number;
    y: number;
    zoom: number;
}

interface CheatModeData {
    enabled: boolean;
    priceMultiplier: number;
    infiniteHp: boolean;
    disableEnergy: boolean;
}

interface RootBuildingData {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
}

interface TowerData {
    type: string;
    creatorFunc: string | null;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    liveTime: number;
    towerLevel: number;
    inValidTerritory: boolean;
    _originalMaxHp: number | null;
    _territoryPenaltyApplied: boolean;
    _originalRangeR: number | null;
    laserFreezeNow?: number;
    laserDamageAdd?: number;
    targetLiveTime?: number;
    rayRotate?: number;
    // Vision attributes
    visionType?: string;
    visionLevel?: number;
    radarAngle?: number;
}

interface BuildingData {
    type: string;
    creatorFunc: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    inValidTerritory: boolean;
    _originalMaxHp: number | null;
    _territoryPenaltyApplied: boolean;
}

// Bullet data for MonsterShooter
interface MonsterBulletData {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    originalX: number;
    originalY: number;
    slideRate: number;
    r?: number;
    isSliptedBully?: boolean;
}

interface MonsterData {
    type: string;
    creatorFunc: string | null;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    r: number;
    speedX: number;
    speedY: number;
    speedFreezeNumb: number;
    burnRate: number;
    colishDamage: number;
    laserDefendNum?: number;
    summonCount?: number;
    liveTime?: number;
    bullys?: MonsterBulletData[];  // MonsterShooter bullets
}

interface MineData {
    x: number;
    y: number;
    state: string;
    powerPlantLevel: number;
    hp: number;
    maxHp: number;
    repairing: boolean;
    repairProgress: number;
    inValidTerritory: boolean;
    _originalMaxHp: number | null;
    _territoryPenaltyApplied: boolean;
}

interface SaveData {
    version: number;
    timestamp: number;
    mode: string;
    haveFlow: boolean;
    world: WorldData;
    camera: CameraData;
    obstacles: unknown[];
    cheatMode: CheatModeData;
    rootBuilding: RootBuildingData;
    towers: TowerData[];
    buildings: BuildingData[];
    monsters: MonsterData[];
    mines: MineData[];
}

interface ValidationResult {
    valid: boolean;
    reason?: string;
    data?: SaveData;
}

// Entity validation configuration
interface EntityValidationConfig {
    entityName: string;
    registry?: { has(name: string): boolean };
}

// World-like interface for type safety
interface WorldLike {
    time: number;
    mode: string;
    haveFlow: boolean;
    width: number;
    height: number;
    gameSpeed: number;
    user: { money: number };
    monsterFlow: { level: number; delayTick: number; state: string };
    monsterFlowNext?: unknown;
    camera: { x: number; y: number; zoom: number; clampPosition: () => void };
    obstacles: Obstacle[];
    cheatMode: { enabled: boolean; priceMultiplier: number; infiniteHp: boolean; disableEnergy: boolean };
    rootBuilding: { pos: Vector; hp: number; maxHp: number };
    batterys: unknown[];
    buildings: unknown[];
    monsters: Set<unknown>;
    mines: Set<unknown>;
    territory?: { markDirty: () => void; recalculate: () => void };
    _rebuildObstacleCache: () => void;
}

interface MonsterGroupClassLike {
    getMonsterFlow: (world: WorldLike, level: number, mode: string) => unknown;
}

export class SaveManager {
    /**
     * Get localStorage key for a specific mode
     */
    static getStorageKey(mode: string, haveFlow: boolean): string {
        return `${SAVE_KEY_PREFIX}${mode}_${haveFlow}`;
    }

    /**
     * Get tower type name for serialization
     */
    static getTowerTypeName(tower: unknown): string {
        const TowerHell = TowerRegistry.getClassType('TowerHell') as any;
        const TowerBoomerang = TowerRegistry.getClassType('TowerBoomerang') as any;
        const TowerHammer = TowerRegistry.getClassType('TowerHammer') as any;
        const TowerRay = TowerRegistry.getClassType('TowerRay') as any;
        const TowerLaser = TowerRegistry.getClassType('TowerLaser') as any;

        if (TowerHell && tower instanceof TowerHell) return "TowerHell";
        if (TowerBoomerang && tower instanceof TowerBoomerang) return "TowerBoomerang";
        if (TowerHammer && tower instanceof TowerHammer) return "TowerHammer";
        if (TowerRay && tower instanceof TowerRay) return "TowerRay";
        if (TowerLaser && tower instanceof TowerLaser) return "TowerLaser";
        return "Tower";
    }

    /**
     * Get monster type name for serialization
     */
    static getMonsterTypeName(monster: unknown): string {
        const MonsterTerminator = MonsterRegistry.getClassType('MonsterTerminator') as any;
        const MonsterMortis = MonsterRegistry.getClassType('MonsterMortis') as any;
        const MonsterShooter = MonsterRegistry.getClassType('MonsterShooter') as any;

        if (MonsterTerminator && monster instanceof MonsterTerminator) return "MonsterTerminator";
        if (MonsterMortis && monster instanceof MonsterMortis) return "MonsterMortis";
        if (MonsterShooter && monster instanceof MonsterShooter) return "MonsterShooter";
        return "Monster";
    }

    /**
     * Find creator function name by matching tower properties
     */
    static findTowerCreatorName(tower: unknown, world: WorldLike): string | null {
        const towerObj = tower as { name: string };
        const names = TowerRegistry.getNames();
        for (const name of names) {
            const creator = TowerRegistry.getCreator(name);
            if (creator) {
                const sample = creator(world as any) as { name: string };
                if (sample.name === towerObj.name) {
                    return name;
                }
            }
        }
        return null;
    }

    /**
     * Find creator function name by matching monster properties
     */
    static findMonsterCreatorName(monster: unknown, world: WorldLike): string | null {
        const monsterObj = monster as { name: string };
        const names = MonsterRegistry.getNames();
        for (const name of names) {
            const creator = MonsterRegistry.getCreator(name);
            if (creator) {
                const sample = creator(world as any) as { name: string };
                if (sample.name === monsterObj.name) {
                    return name;
                }
            }
        }
        return null;
    }

    /**
     * Serialize world state to save data object
     */
    static serialize(world: WorldLike): SaveData {
        const saveData: SaveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            mode: world.mode,
            haveFlow: world.haveFlow,

            world: {
                time: world.time,
                money: world.user.money,
                flowLevel: world.monsterFlow.level,
                flowDelayTick: world.monsterFlow.delayTick,
                flowState: world.monsterFlow.state,
                width: world.width,
                height: world.height,
                gameSpeed: world.gameSpeed,
            },

            camera: {
                x: world.camera.x,
                y: world.camera.y,
                zoom: world.camera.zoom,
            },

            obstacles: world.obstacles.map(obs => obs.serialize()),

            cheatMode: {
                enabled: world.cheatMode.enabled,
                priceMultiplier: world.cheatMode.priceMultiplier,
                infiniteHp: world.cheatMode.infiniteHp,
                disableEnergy: world.cheatMode.disableEnergy,
            },

            rootBuilding: {
                x: world.rootBuilding.pos.x,
                y: world.rootBuilding.pos.y,
                hp: world.rootBuilding.hp,
                maxHp: world.rootBuilding.maxHp,
            },

            towers: [],
            buildings: [],
            monsters: [],
            mines: [],
        };

        // Get class types for instanceof checks
        const TowerLaser = TowerRegistry.getClassType('TowerLaser') as any;
        const TowerHell = TowerRegistry.getClassType('TowerHell') as any;
        const TowerRay = TowerRegistry.getClassType('TowerRay') as any;
        const MonsterShooter = MonsterRegistry.getClassType('MonsterShooter') as any;

        // Warn if tower count seems abnormally low for the game progress
        const towerCount = world.batterys.length;
        if (towerCount === 0 && world.time > 1000) {
            console.warn(`[SaveManager] WARNING: No towers to save at time ${world.time}! This may indicate data loss.`);
        }

        // Serialize towers
        for (const tower of world.batterys) {
            const t = tower as any;
            const towerData: TowerData = {
                type: this.getTowerTypeName(tower),
                creatorFunc: this.findTowerCreatorName(tower, world),
                x: t.pos.x,
                y: t.pos.y,
                hp: t.hp,
                maxHp: t.maxHp,
                liveTime: t.liveTime,
                towerLevel: t.towerLevel,
                inValidTerritory: t.inValidTerritory,
                _originalMaxHp: t._originalMaxHp,
                _territoryPenaltyApplied: t._territoryPenaltyApplied,
                _originalRangeR: t._originalRangeR,
                // Vision attributes
                visionType: t.visionType,
                visionLevel: t.visionLevel,
                radarAngle: t.radarAngle,
            };

            // TowerLaser specific
            if (TowerLaser && tower instanceof TowerLaser) {
                towerData.laserFreezeNow = t.laserFreezeNow || 0;
                towerData.laserDamageAdd = t.laserDamageAdd || 0;
            }

            // TowerHell specific
            if (TowerHell && tower instanceof TowerHell) {
                towerData.targetLiveTime = t.targetLiveTime || 0;
            }

            // TowerRay specific
            if (TowerRay && tower instanceof TowerRay) {
                towerData.rayRotate = t.rayRotate || 0;
            }

            saveData.towers.push(towerData);
        }

        // Serialize buildings (excluding rootBuilding and Mine)
        for (const building of world.buildings) {
            const b = building as any;
            if (building === world.rootBuilding) continue;
            if (b.gameType === "Mine") continue;

            const buildingData: BuildingData = {
                type: "Building",
                creatorFunc: b.name === "金矿" ? "Collector" : "Treatment",
                x: b.pos.x,
                y: b.pos.y,
                hp: b.hp,
                maxHp: b.maxHp,
                inValidTerritory: b.inValidTerritory,
                _originalMaxHp: b._originalMaxHp,
                _territoryPenaltyApplied: b._territoryPenaltyApplied,
            };
            saveData.buildings.push(buildingData);
        }

        // Serialize monsters
        for (const monster of world.monsters) {
            const m = monster as any;
            const monsterData: MonsterData = {
                type: this.getMonsterTypeName(monster),
                creatorFunc: this.findMonsterCreatorName(monster, world),
                x: m.pos.x,
                y: m.pos.y,
                hp: m.hp,
                maxHp: m.maxHp,
                r: m.r,
                speedX: m.speed.x,
                speedY: m.speed.y,
                speedFreezeNumb: m.speedFreezeNumb || 0,
                burnRate: m.burnRate || 0,
                colishDamage: m.colishDamage,
            };

            if (m.haveLaserDefence) {
                monsterData.laserDefendNum = m.laserDefendNum;
            }

            if (m.summonAble) {
                monsterData.summonCount = m.summonCount;
            }

            if (MonsterShooter && monster instanceof MonsterShooter) {
                monsterData.liveTime = m.liveTime;

                // Serialize bullets
                if (m.bullys && m.bullys.size > 0) {
                    monsterData.bullys = Array.from(m.bullys).map((b: any) => ({
                        x: b.pos.x,
                        y: b.pos.y,
                        speedX: b.speed.x,
                        speedY: b.speed.y,
                        originalX: b.originalPos.x,
                        originalY: b.originalPos.y,
                        slideRate: b.slideRate,
                        r: b.r,
                        isSliptedBully: b.isSliptedBully || false,
                    }));
                }
            }

            saveData.monsters.push(monsterData);
        }

        // Serialize mines
        for (const mine of world.mines) {
            const m = mine as any;
            const mineData: MineData = {
                x: m.pos.x,
                y: m.pos.y,
                state: m.state,
                powerPlantLevel: m.powerPlantLevel,
                hp: m.hp,
                maxHp: m.maxHp,
                repairing: m.repairing,
                repairProgress: m.repairProgress,
                inValidTerritory: m.inValidTerritory,
                _originalMaxHp: m._originalMaxHp,
                _territoryPenaltyApplied: m._territoryPenaltyApplied,
            };
            saveData.mines.push(mineData);
        }

        return saveData;
    }

    /**
     * Deserialize save data and restore world state
     */
    static deserialize(saveData: SaveData, world: WorldLike, MonsterGroupClass: MonsterGroupClassLike | null): boolean {
        try {
            // Get class types for instanceof checks
            const TowerLaser = TowerRegistry.getClassType('TowerLaser') as any;
            const TowerHell = TowerRegistry.getClassType('TowerHell') as any;
            const TowerBoomerang = TowerRegistry.getClassType('TowerBoomerang') as any;
            const TowerHammer = TowerRegistry.getClassType('TowerHammer') as any;
            const TowerRay = TowerRegistry.getClassType('TowerRay') as any;

            // Restore world basic properties
            world.time = saveData.world.time;
            world.user.money = saveData.world.money;
            world.mode = saveData.mode;
            world.haveFlow = saveData.haveFlow;

            if (saveData.world.gameSpeed !== undefined) {
                world.gameSpeed = saveData.world.gameSpeed;
            }

            // Restore rootBuilding position and HP
            // Position must be restored to avoid overlapping with other buildings
            if (saveData.rootBuilding.x !== undefined && saveData.rootBuilding.y !== undefined) {
                world.rootBuilding.pos.x = saveData.rootBuilding.x;
                world.rootBuilding.pos.y = saveData.rootBuilding.y;
            }
            world.rootBuilding.hp = saveData.rootBuilding.hp;
            world.rootBuilding.maxHp = saveData.rootBuilding.maxHp;

            // Restore wave state
            if (MonsterGroupClass) {
                world.monsterFlow = MonsterGroupClass.getMonsterFlow(world, saveData.world.flowLevel, saveData.mode) as any;
                (world.monsterFlow as any).delayTick = saveData.world.flowDelayTick;
                (world.monsterFlow as any).state = saveData.world.flowState;
                world.monsterFlowNext = MonsterGroupClass.getMonsterFlow(world, saveData.world.flowLevel + 1, saveData.mode);
            }

            // Restore cheat mode state
            if (saveData.cheatMode) {
                world.cheatMode.enabled = saveData.cheatMode.enabled || false;
                world.cheatMode.priceMultiplier = saveData.cheatMode.priceMultiplier !== undefined
                    ? saveData.cheatMode.priceMultiplier
                    : 1.0;
                world.cheatMode.infiniteHp = saveData.cheatMode.infiniteHp || false;
                world.cheatMode.disableEnergy = saveData.cheatMode.disableEnergy || false;
            }

            // Restore camera state
            if (saveData.camera) {
                world.camera.x = saveData.camera.x;
                world.camera.y = saveData.camera.y;
                world.camera.zoom = saveData.camera.zoom;
                world.camera.clampPosition();
            }

            // Restore obstacles
            if (saveData.obstacles) {
                world.obstacles = saveData.obstacles.map(data => Obstacle.deserialize(data as any));
                world._rebuildObstacleCache();
            }

            // Clear existing entities (except rootBuilding)
            world.batterys = [];
            world.buildings = [world.rootBuilding];
            world.monsters = new Set();
            world.mines = new Set();

            // Restore towers
            for (const towerData of saveData.towers) {
                const creator = TowerRegistry.getCreator(towerData.creatorFunc || '');
                if (!creator) {
                    console.warn("[SaveManager] Unknown tower creator:", towerData.creatorFunc, "- tower will be skipped");
                    continue;
                }

                const tower = creator(world as any) as any;
                tower.pos = new Vector(towerData.x, towerData.y);
                tower.hp = towerData.hp;
                tower.maxHp = towerData.maxHp;
                tower.liveTime = towerData.liveTime;
                tower.towerLevel = towerData.towerLevel || 1;

                tower.inValidTerritory = towerData.inValidTerritory !== undefined ? towerData.inValidTerritory : true;
                tower._originalMaxHp = towerData._originalMaxHp || null;
                tower._territoryPenaltyApplied = towerData._territoryPenaltyApplied || false;
                tower._originalRangeR = towerData._originalRangeR || null;

                if (TowerLaser && tower instanceof TowerLaser) {
                    tower.laserFreezeNow = towerData.laserFreezeNow || 0;
                    tower.laserDamageAdd = towerData.laserDamageAdd || 0;
                }

                if (TowerHell && tower instanceof TowerHell) {
                    tower.targetLiveTime = towerData.targetLiveTime || 0;
                    tower.target = null;
                }

                if (TowerBoomerang && tower instanceof TowerBoomerang) {
                    tower.bar = tower.initBar();
                }

                if (TowerHammer && tower instanceof TowerHammer) {
                    tower.additionItem = tower.initAdditionItem();
                }

                if (TowerRay && tower instanceof TowerRay && towerData.rayRotate !== undefined) {
                    tower.rayRotate = towerData.rayRotate;
                }

                // Restore vision attributes (backward compatible with old saves)
                tower.visionType = towerData.visionType || 'none';
                tower.visionLevel = towerData.visionLevel || 0;
                tower.radarAngle = towerData.radarAngle || 0;

                world.batterys.push(tower);
            }

            // Restore buildings
            for (const buildingData of saveData.buildings) {
                const creator = BuildingRegistry.getCreator(buildingData.creatorFunc);
                if (!creator) {
                    console.warn("Unknown building creator:", buildingData.creatorFunc);
                    continue;
                }

                const building = creator(world as any) as any;
                building.pos = new Vector(buildingData.x, buildingData.y);
                building.hp = buildingData.hp;
                building.maxHp = buildingData.maxHp;

                building.inValidTerritory = buildingData.inValidTerritory !== undefined ? buildingData.inValidTerritory : true;
                building._originalMaxHp = buildingData._originalMaxHp || null;
                building._territoryPenaltyApplied = buildingData._territoryPenaltyApplied || false;

                world.buildings.push(building);
            }

            // Restore monsters
            const MonsterShooter = MonsterRegistry.getClassType('MonsterShooter') as any;
            for (const monsterData of saveData.monsters) {
                const creator = MonsterRegistry.getCreator(monsterData.creatorFunc || '');
                if (!creator) {
                    console.warn("Unknown monster creator:", monsterData.creatorFunc);
                    continue;
                }

                const monster = creator(world as any) as any;
                monster.pos = new Vector(monsterData.x, monsterData.y);
                monster.hp = monsterData.hp;
                monster.maxHp = monsterData.maxHp;
                monster.r = monsterData.r;
                monster.changedSpeed = new Vector(monsterData.speedX, monsterData.speedY);
                monster.speedFreezeNumb = monsterData.speedFreezeNumb;
                monster.burnRate = monsterData.burnRate;
                monster.colishDamage = monsterData.colishDamage;
                // Create a copy, not a reference! Otherwise monster AI will modify rootBuilding.pos
                monster.destination = new Vector(world.rootBuilding.pos.x, world.rootBuilding.pos.y);

                if (monsterData.laserDefendNum !== undefined) {
                    monster.laserDefendNum = monsterData.laserDefendNum;
                }

                if (monsterData.summonCount !== undefined) {
                    monster.summonCount = monsterData.summonCount;
                }

                if (monsterData.liveTime !== undefined) {
                    monster.liveTime = monsterData.liveTime;
                }

                // Restore MonsterShooter bullets
                if (monsterData.bullys && MonsterShooter && monster instanceof MonsterShooter) {
                    for (const bulletData of monsterData.bullys) {
                        const bullet = monster.getRunningBully();
                        if (bullet) {
                            bullet.pos = new Vector(bulletData.x, bulletData.y);
                            bullet.speed = new Vector(bulletData.speedX, bulletData.speedY);
                            bullet.originalPos = new Vector(bulletData.originalX, bulletData.originalY);
                            bullet.slideRate = bulletData.slideRate;
                            if (bulletData.r !== undefined) {
                                bullet.r = bulletData.r;
                            }
                            if (bulletData.isSliptedBully !== undefined) {
                                bullet.isSliptedBully = bulletData.isSliptedBully;
                            }
                            monster.bullys.add(bullet);
                        }
                    }
                }

                world.monsters.add(monster);
            }

            // Restore mines
            if (saveData.mines) {
                for (const mineData of saveData.mines) {
                    const mine = new Mine(new Vector(mineData.x, mineData.y), world as any) as any;
                    mine.state = mineData.state;
                    mine.powerPlantLevel = mineData.powerPlantLevel;
                    mine.hp = mineData.hp;
                    mine.maxHp = mineData.maxHp;
                    mine.repairing = mineData.repairing || false;
                    mine.repairProgress = mineData.repairProgress || 0;
                    mine._updateRadius();

                    mine.inValidTerritory = mineData.inValidTerritory !== undefined ? mineData.inValidTerritory : true;
                    mine._originalMaxHp = mineData._originalMaxHp || null;
                    mine._territoryPenaltyApplied = mineData._territoryPenaltyApplied || false;

                    world.mines.add(mine);

                    if (mine.state === Mine.STATE_POWER_PLANT) {
                        world.buildings.push(mine);
                    }
                }
            }

            // Recalculate territory after loading
            if (world.territory) {
                world.territory.markDirty();
                world.territory.recalculate();
            }

            // Rebuild fog vision cache after loading
            if ((world as any).fog) {
                (world as any).fog.markDirty();
            }

            // Mark static layer dirty to rebuild building render cache
            // This ensures rootBuilding renders at the restored position
            if (typeof world.markStaticLayerDirty === 'function') {
                world.markStaticLayerDirty();
            }

            return true;
        } catch (error) {
            console.error("Failed to deserialize save data:", error);
            return false;
        }
    }

    /**
     * Save to localStorage
     */
    static saveToLocal(mode: string, haveFlow: boolean, data: SaveData): boolean {
        try {
            const key = this.getStorageKey(mode, haveFlow);
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Failed to save to localStorage:", error);
            return false;
        }
    }

    /**
     * Load from localStorage
     */
    static loadFromLocal(mode: string, haveFlow: boolean): SaveData | null {
        try {
            const key = this.getStorageKey(mode, haveFlow);
            const data = localStorage.getItem(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (error) {
            console.error("Failed to load from localStorage:", error);
            return null;
        }
    }

    /**
     * Check if save exists
     */
    static hasSave(mode: string, haveFlow: boolean): boolean {
        const key = this.getStorageKey(mode, haveFlow);
        return localStorage.getItem(key) !== null;
    }

    /**
     * Clear save
     */
    static clearSave(mode: string, haveFlow: boolean): void {
        const key = this.getStorageKey(mode, haveFlow);
        localStorage.removeItem(key);
    }

    /**
     * Export save data to JSON file download
     */
    static exportToFile(data: SaveData): void {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `HitWar_save_${data.mode}_${data.haveFlow}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import save data from file
     */
    static importFromFile(file: File): Promise<SaveData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    const validation = this.validateSave(data);
                    if (validation.valid && validation.data) {
                        resolve(validation.data);
                    } else {
                        reject(new Error(validation.reason));
                    }
                } catch (error) {
                    reject(new Error("Invalid JSON file"));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    /**
     * Check if value is a valid finite number
     */
    private static isValidNumber(v: unknown): v is number {
        return typeof v === 'number' && !isNaN(v) && isFinite(v);
    }

    /**
     * Check if value is a valid non-negative number
     */
    private static isValidPositiveNumber(v: unknown): v is number {
        return this.isValidNumber(v) && v >= 0;
    }

    /**
     * Validate common entity data (coordinates, HP, optional registry check)
     */
    private static validateEntityData(data: unknown, config: EntityValidationConfig): string | null {
        if (!data || typeof data !== 'object') return `${config.entityName}数据格式无效`;
        const entity = data as Record<string, unknown>;

        if (!this.isValidNumber(entity.x) || !this.isValidNumber(entity.y)) {
            return `${config.entityName}坐标无效`;
        }
        if (!this.isValidPositiveNumber(entity.hp) || !this.isValidPositiveNumber(entity.maxHp)) {
            return `${config.entityName}HP无效`;
        }
        if (config.registry && entity.creatorFunc !== null && typeof entity.creatorFunc === 'string') {
            if (!config.registry.has(entity.creatorFunc)) {
                return `未知的${config.entityName}类型: ${entity.creatorFunc}`;
            }
        }
        return null;
    }

    /**
     * Validate tower data
     */
    private static validateTowerData(data: unknown): string | null {
        return this.validateEntityData(data, { entityName: '塔', registry: TowerRegistry });
    }

    /**
     * Validate monster data
     */
    private static validateMonsterData(data: unknown): string | null {
        return this.validateEntityData(data, { entityName: '怪物', registry: MonsterRegistry });
    }

    /**
     * Validate building data
     */
    private static validateBuildingData(data: unknown): string | null {
        return this.validateEntityData(data, { entityName: '建筑', registry: BuildingRegistry });
    }

    /**
     * Validate mine data
     */
    private static validateMineData(data: unknown): string | null {
        return this.validateEntityData(data, { entityName: '矿点' });
    }

    /**
     * Validate save data
     */
    static validateSave(data: SaveData): ValidationResult {
        if (!data.version) {
            return { valid: false, reason: "存档无版本号，无法加载" };
        }
        if (data.version > SAVE_VERSION) {
            return { valid: false, reason: "存档版本过高，请更新游戏" };
        }
        if (data.version < SAVE_VERSION) {
            return this.migrate(data);
        }
        if (!data.mode || !data.world || !data.rootBuilding) {
            return { valid: false, reason: "存档数据不完整" };
        }

        // Validate world data
        if (!this.isValidNumber(data.world.time) || !this.isValidNumber(data.world.money)) {
            return { valid: false, reason: "世界数据无效" };
        }

        // Validate towers
        if (Array.isArray(data.towers)) {
            for (let i = 0; i < data.towers.length; i++) {
                const error = this.validateTowerData(data.towers[i]);
                if (error) {
                    return { valid: false, reason: `塔[${i}]: ${error}` };
                }
            }
        }

        // Validate monsters
        if (Array.isArray(data.monsters)) {
            for (let i = 0; i < data.monsters.length; i++) {
                const error = this.validateMonsterData(data.monsters[i]);
                if (error) {
                    return { valid: false, reason: `怪物[${i}]: ${error}` };
                }
            }
        }

        // Validate buildings
        if (Array.isArray(data.buildings)) {
            for (let i = 0; i < data.buildings.length; i++) {
                const error = this.validateBuildingData(data.buildings[i]);
                if (error) {
                    return { valid: false, reason: `建筑[${i}]: ${error}` };
                }
            }
        }

        // Validate mines
        if (Array.isArray(data.mines)) {
            for (let i = 0; i < data.mines.length; i++) {
                const error = this.validateMineData(data.mines[i]);
                if (error) {
                    return { valid: false, reason: `矿点[${i}]: ${error}` };
                }
            }
        }

        return { valid: true, data };
    }

    /**
     * Migrate old save data to current version
     */
    static migrate(data: SaveData): ValidationResult {
        if (data.version === 1) {
            return {
                valid: false,
                reason: "游戏更新了地图系统，旧存档无法迁移，请开始新游戏"
            };
        }
        if (data.version === 2) {
            return {
                valid: false,
                reason: "游戏更新了地图尺寸，旧存档无法迁移，请开始新游戏"
            };
        }
        return { valid: true, data };
    }

    /**
     * Format timestamp for display
     */
    static formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleString("zh-CN");
    }
}
