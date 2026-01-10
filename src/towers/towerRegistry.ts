/**
 * TowerRegistry - Central registry for all tower types
 *
 * This registry provides a unified interface for tower creation and class lookup,
 * maintaining backward compatibility with the save system while supporting ES modules.
 */

type TowerCreator<T = unknown> = (world: unknown) => T;
type ClassGetter<T = unknown> = () => T;

/**
 * Metadata for tower types, used to avoid creating instances just for display
 */
export interface TowerMeta {
    name: string;        // Tower display name
    imgIndex: number;    // Image sprite index
    basePrice: number;   // Base price (without dynamic additions)
}

export class TowerRegistry {
    static _creators: Map<string, TowerCreator> = new Map();
    static _classTypes: Map<string, ClassGetter> = new Map();
    static _metas: Map<string, TowerMeta> = new Map();

    /**
     * Register a tower creator function with metadata
     */
    static register(name: string, creator: TowerCreator, meta: TowerMeta): void {
        this._creators.set(name, creator);
        this._metas.set(name, meta);
    }

    /**
     * Register a tower class type (for special tower classes like TowerLaser)
     */
    static registerClassType(name: string, classGetter: ClassGetter): void {
        this._classTypes.set(name, classGetter);
    }

    /**
     * Get a tower creator by name
     */
    static getCreator(name: string): TowerCreator | undefined {
        return this._creators.get(name);
    }

    /**
     * Get tower metadata by name
     */
    static getMeta(name: string): TowerMeta | undefined {
        return this._metas.get(name);
    }

    /**
     * Get a tower class type by name
     */
    static getClassType(name: string): unknown | null {
        const getter = this._classTypes.get(name);
        return getter ? getter() : null;
    }

    /**
     * Create a tower instance by name
     */
    static create(name: string, world: unknown): unknown | null {
        const creator = this._creators.get(name);
        return creator ? creator(world) : null;
    }

    /**
     * Check if a tower type is registered
     */
    static has(name: string): boolean {
        return this._creators.has(name);
    }

    /**
     * Get all registered tower names
     */
    static getNames(): string[] {
        return Array.from(this._creators.keys());
    }

    /**
     * Get TowerCreators as object (for save system compatibility)
     */
    static get TowerCreators(): Record<string, TowerCreator> {
        return Object.fromEntries(this._creators);
    }

    /**
     * Get TowerClassTypes as object (for save system compatibility)
     */
    static get TowerClassTypes(): Record<string, ClassGetter> {
        return Object.fromEntries(this._classTypes);
    }
}
