/**
 * MonsterRegistry - Central registry for all monster types
 *
 * Extends BaseRegistry for unified entity management.
 */

import { BaseRegistry, type Creator, type ClassGetter } from '@/core/registry';

type MonsterCreator = Creator<unknown>;

export class MonsterRegistry extends BaseRegistry<MonsterCreator> {
    static override _creators: Map<string, MonsterCreator> = new Map();
    static override _classTypes: Map<string, ClassGetter> = new Map();

    /**
     * Get MonsterCreators as object (for save system compatibility)
     */
    static get MonsterCreators(): Record<string, MonsterCreator> {
        return this._getCreatorsObject() as Record<string, MonsterCreator>;
    }

    /**
     * Get MonsterClassTypes as object (for save system compatibility)
     */
    static get MonsterClassTypes(): Record<string, ClassGetter> {
        return this._getClassTypesObject();
    }
}
