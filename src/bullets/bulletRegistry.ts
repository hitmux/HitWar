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

    static get BulletCreators(): Record<string, BulletCreator> {
        return this._getCreatorsObject() as Record<string, BulletCreator>;
    }

    static get BulletClassTypes(): Record<string, ClassGetter> {
        return this._getClassTypesObject();
    }
}
