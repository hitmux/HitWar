/**
 * TowerRegistry - Central registry for all tower types
 *
 * Extends BaseRegistry with tower-specific metadata support.
 */

import { BaseRegistry, type Creator, type ClassGetter } from '@/core/registry';

type TowerCreator = Creator<unknown>;

/**
 * Metadata for tower types, used to avoid creating instances just for display
 */
export interface TowerMeta {
    name: string;        // Tower display name
    imgIndex: number;    // Image sprite index
    basePrice: number;   // Base price (without dynamic additions)
}

export class TowerRegistry extends BaseRegistry<TowerCreator> {
    static override _creators: Map<string, TowerCreator> = new Map();
    static override _classTypes: Map<string, ClassGetter> = new Map();
    static _metas: Map<string, TowerMeta> = new Map();

    /**
     * Register a tower creator function with metadata
     */
    static override register(name: string, creator: TowerCreator, meta: TowerMeta): void {
        this._creators.set(name, creator);
        this._metas.set(name, meta);
    }

    /**
     * Get tower metadata by name
     */
    static getMeta(name: string): TowerMeta | undefined {
        return this._metas.get(name);
    }

    /**
     * Get TowerCreators as object (for save system compatibility)
     */
    static get TowerCreators(): Record<string, TowerCreator> {
        return this._getCreatorsObject() as Record<string, TowerCreator>;
    }

    /**
     * Get TowerClassTypes as object (for save system compatibility)
     */
    static get TowerClassTypes(): Record<string, ClassGetter> {
        return this._getClassTypesObject();
    }
}
