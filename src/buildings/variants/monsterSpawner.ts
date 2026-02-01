/**
 * MonsterSpawner Building - Allows players to spawn monsters to attack enemies
 *
 * Only functional in multiplayer mode. Each monster type has its own cooldown.
 */

import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Building } from '../building';
import { BuildingRegistry } from '../buildingRegistry';
import { MonsterRegistry } from '../../monsters/monsterRegistry';
import { SPAWNABLE_MONSTERS, SpawnableMonster } from '../spawnerConfig';

// Type for monster instances
interface MonsterInstance {
    ownerId: string | null;
    pos: Vector;
    destination: Vector;
}

// Extended world interface (uses type assertion at runtime)
interface SpawnerWorld {
    getPlayerManager(): any;
    monsterFlow?: { level: number };
    addMonster(monster: any): void;
    width: number;
    height: number;
    getMoney(playerId?: string): number;
    spendMoney(amount: number, playerId?: string): boolean;
    addMoneyToOwner(playerId: string | null, amount: number): void;
}

/**
 * MonsterSpawner class - Building that can spawn monsters
 */
export class MonsterSpawner extends Building {
    /** Flag to identify this building type */
    canSpawnMonsters: boolean = true;

    /** Cooldowns for each monster type (monsterId -> remaining ticks) */
    private cooldowns: Map<string, number> = new Map();

    constructor(pos: Vector, world: any) {
        super(pos, world);
        this.gameType = "Building";
        this.name = "怪物生成塔";
        this.price = 500;
        this.r = 15;
        this.hpInit(3000);

        // Dark red theme
        this.bodyColor = new MyColor(80, 20, 20, 0.9);
        this.bodyStrokeColor = new MyColor(120, 30, 30, 1);
        this.bodyStrokeWidth = 3;

        // Initialize cooldowns for all spawnable monsters
        for (const config of SPAWNABLE_MONSTERS) {
            this.cooldowns.set(config.monsterId, 0);
        }
    }

    /** Get world with extended interface */
    private get spawnerWorld(): SpawnerWorld {
        return this.world as unknown as SpawnerWorld;
    }

    /**
     * Override goStep to handle cooldown countdown
     */
    goStep(): void {
        super.goStep();

        // Decrement all active cooldowns
        for (const [monsterId, ticks] of this.cooldowns) {
            if (ticks > 0) {
                this.cooldowns.set(monsterId, ticks - 1);
            }
        }
    }

    /**
     * Get current wave number from game state
     */
    getCurrentWave(): number {
        return this.spawnerWorld.monsterFlow?.level ?? 1;
    }

    /**
     * Check if a monster type is available to spawn
     */
    isMonsterAvailable(config: SpawnableMonster): boolean {
        // Check wave unlock
        if (this.getCurrentWave() < config.unlockWave) {
            return false;
        }

        // Check cooldown
        const remainingCooldown = this.cooldowns.get(config.monsterId) ?? 0;
        if (remainingCooldown > 0) {
            return false;
        }

        // Check valid territory
        if (!this.inValidTerritory) {
            return false;
        }

        return true;
    }

    /**
     * Get remaining cooldown for a monster type
     */
    getCooldown(monsterId: string): number {
        return this.cooldowns.get(monsterId) ?? 0;
    }

    /**
     * Check if player can afford to spawn a monster
     */
    canAfford(config: SpawnableMonster): boolean {
        const playerMoney = this.spawnerWorld.getMoney(this.ownerId ?? undefined);
        return playerMoney >= config.cost;
    }

    /**
     * Spawn a monster targeting a specific player
     * @returns true if spawn was successful
     */
    spawnMonster(config: SpawnableMonster, targetPlayerId: string): boolean {
        // Validate availability
        if (!this.isMonsterAvailable(config)) {
            return false;
        }

        // Check cost
        if (!this.canAfford(config)) {
            return false;
        }

        // Deduct cost
        const world = this.spawnerWorld;
        const success = world.spendMoney(config.cost, this.ownerId ?? undefined);
        if (!success) {
            return false;
        }

        // Create monster
        const monster = MonsterRegistry.create(config.monsterId, this.world) as MonsterInstance | null;
        if (!monster) {
            // Refund if monster creation failed
            world.addMoneyToOwner(this.ownerId, config.cost);
            return false;
        }

        // Set monster owner to spawner's owner
        monster.ownerId = this.ownerId;

        // Calculate spawn position near target player's base
        const spawnPos = this.calcSpawnPosition(targetPlayerId);
        monster.pos = spawnPos;

        // Set destination to target player's base
        const targetBase = this.getTargetBase(targetPlayerId);
        if (targetBase) {
            monster.destination = new Vector(targetBase.pos.x, targetBase.pos.y);
        }

        // Add monster to world
        world.addMonster(monster);

        // Set cooldown
        this.cooldowns.set(config.monsterId, config.cooldownTicks);

        return true;
    }

    /**
     * Get target player's base building
     */
    private getTargetBase(targetPlayerId: string): any {
        const playerManager = this.spawnerWorld.getPlayerManager();
        if (!playerManager) return null;
        return playerManager.getBaseBuilding(targetPlayerId);
    }

    /**
     * Calculate spawn position near target player's base
     *
     * Spawns at the edge of target's territory, on the side facing the spawner.
     */
    calcSpawnPosition(targetPlayerId: string): Vector {
        const world = this.spawnerWorld;
        const targetBase = this.getTargetBase(targetPlayerId);
        if (!targetBase) {
            // Fallback: spawn near this building
            return new Vector(
                this.pos.x + (Math.random() - 0.5) * 60,
                this.pos.y + (Math.random() - 0.5) * 60
            );
        }

        // Direction from spawner to target base
        const dx = targetBase.pos.x - this.pos.x;
        const dy = targetBase.pos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            // Same position, random direction
            return new Vector(
                targetBase.pos.x + (Math.random() - 0.5) * 100,
                targetBase.pos.y + (Math.random() - 0.5) * 100
            );
        }

        // Normalize direction (from target base towards spawner)
        const dirX = -dx / dist;
        const dirY = -dy / dist;

        // Spawn at territory edge + some distance (20~60 units)
        const territoryRadius = 200; // Approximate territory radius
        const spawnDistance = territoryRadius + 20 + Math.random() * 40;

        // Add perpendicular random offset to avoid stacking
        const perpX = -dirY;
        const perpY = dirX;
        const perpOffset = (Math.random() - 0.5) * 80;

        let spawnX = targetBase.pos.x + dirX * spawnDistance + perpX * perpOffset;
        let spawnY = targetBase.pos.y + dirY * spawnDistance + perpY * perpOffset;

        // Clamp to world bounds
        const margin = 30;
        spawnX = Math.max(margin, Math.min(world.width - margin, spawnX));
        spawnY = Math.max(margin, Math.min(world.height - margin, spawnY));

        return new Vector(spawnX, spawnY);
    }

    /**
     * Get enemy players (for UI display)
     */
    getEnemyPlayers(): { id: string; name: string }[] {
        const playerManager = this.spawnerWorld.getPlayerManager();
        if (!playerManager) return [];

        const allPlayers = playerManager.getAllPlayers();
        return allPlayers
            .filter((p: any) => p.id !== this.ownerId && p.isAlive)
            .map((p: any) => ({ id: p.id, name: p.name }));
    }

    /**
     * Check if multiplayer mode
     */
    isMultiplayerMode(): boolean {
        const playerManager = this.spawnerWorld.getPlayerManager();
        return playerManager?.isMultiplayer ?? false;
    }

    /**
     * Custom serialization for save system
     */
    toJSON(): Record<string, unknown> {
        return {
            cooldowns: Object.fromEntries(this.cooldowns),
        };
    }

    /**
     * Restore from save data
     */
    fromJSON(data: Record<string, unknown>): void {
        if (data.cooldowns && typeof data.cooldowns === 'object') {
            const cooldownData = data.cooldowns as Record<string, number>;
            for (const [monsterId, ticks] of Object.entries(cooldownData)) {
                if (typeof ticks === 'number') {
                    this.cooldowns.set(monsterId, ticks);
                }
            }
        }
    }
}

/**
 * Factory function for MonsterSpawner
 */
export function MonsterSpawnerFactory(world: unknown): MonsterSpawner {
    return new MonsterSpawner(Vector.zero(), world);
}

// Register with BuildingRegistry
BuildingRegistry.register('MonsterSpawner', MonsterSpawnerFactory as any);
BuildingRegistry.registerClassType('MonsterSpawner', () => MonsterSpawner);
