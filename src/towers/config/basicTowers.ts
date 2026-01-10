/**
 * Basic tower configurations
 *
 * Contains: BasicCannon, AncientCannon (2 towers)
 */

import type { TowerConfig, DynamicPriceTowerConfig } from './types';
import { createBasicCannonPriceCalculator } from './factory';

/**
 * BasicCannon - The most basic tower type
 * Has dynamic pricing based on tower count
 */
export const BASIC_CANNON_CONFIG: DynamicPriceTowerConfig = {
    id: 'BasicCannon',
    baseClass: 'Tower',
    name: '基础炮塔',
    imgIndex: 0,
    price: 50,
    comment: '最基础的炮塔，想获得厉害的炮塔就要从它开始进化，但是基础炮塔不太能无限获取，获取基础炮塔越多，需要的费用就越贵，其实只是在限制你不能在舞台上摆放太多的炮塔造成卡顿而已啦。',
    levelUpArr: ['AncientCannon', 'TraditionalCannon', 'FutureCannon_1'],
    levelDownGetter: null,
    priceCalculator: createBasicCannonPriceCalculator()
};

/**
 * AncientCannon - Medieval style tower
 */
export const ANCIENT_CANNON_CONFIG: TowerConfig = {
    id: 'AncientCannon',
    baseClass: 'Tower',
    name: '中世纪炮塔',
    imgIndex: 1,
    price: 60,
    comment: '从基础炮塔升到这一个炮塔之后，接下来的炮塔都是中世纪风格的炮塔。',
    levelUpArr: ['Boomerang', 'ArrowBow_1', 'Hammer', 'StoneCannon'],
    levelDownGetter: 'BasicCannon',
    params: {
        rAdd: 1,
        hp: 2000,
        rangeR: 105, // base 100 + 5
        bulletType: 'littleStone'
    }
};

/**
 * All basic tower configurations
 */
export const BASIC_TOWER_CONFIGS = [
    BASIC_CANNON_CONFIG,
    ANCIENT_CANNON_CONFIG
];
