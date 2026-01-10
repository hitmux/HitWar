/**
 * BuildingRegistry - Central registry for all building types
 *
 * Extends BaseRegistry for unified entity management.
 */

import { BaseRegistry, type Creator, type ClassGetter } from '@/core/registry';

type BuildingCreator = Creator<unknown>;

export class BuildingRegistry extends BaseRegistry<BuildingCreator> {
    static override _creators: Map<string, BuildingCreator> = new Map();
    static override _classTypes: Map<string, ClassGetter> = new Map();

    /**
     * Get BuildingCreators as object (for save system compatibility)
     */
    static get BuildingCreators(): Record<string, BuildingCreator> {
        return this._getCreatorsObject() as Record<string, BuildingCreator>;
    }

    /**
     * Get BuildingClassTypes as object (for save system compatibility)
     */
    static get BuildingClassTypes(): Record<string, ClassGetter> {
        return this._getClassTypesObject();
    }
}
