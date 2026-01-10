/**
 * BulletRegistry - Central registry for bullet types
 *
 * Extends BaseRegistry for unified entity management.
 */

import { BaseRegistry, type Creator, type ClassGetter } from '@/core/registry';

type BulletCreator = Creator<unknown>;

export class BulletRegistry extends BaseRegistry<BulletCreator> {
    static override _creators: Map<string, BulletCreator> = new Map();
    static override _classTypes: Map<string, ClassGetter> = new Map();

    /**
     * Get BulletCreators as object (for save system compatibility)
     */
    static get BulletCreators(): Record<string, BulletCreator> {
        return this._getCreatorsObject() as Record<string, BulletCreator>;
    }

    /**
     * @deprecated Use BulletCreators instead (typo fix)
     * Backward compatibility: BullyCreators object
     */
    static get BullyCreators(): Record<string, BulletCreator> {
        return this.BulletCreators;
    }

    /**
     * Get BulletClassTypes as object (for save system compatibility)
     */
    static get BulletClassTypes(): Record<string, ClassGetter> {
        return this._getClassTypesObject();
    }
}
