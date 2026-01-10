/**
 * Basic tower variants
 *
 * Contains: BasicCannon, AncientCannon (2 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally, Functions will be resolved from global scope until bullets module is migrated
declare const BullyFinally: {
    littleStone: (() => unknown) | null;
} | undefined;

declare const Functions: {
    TowerNumPriceAdded(num: number): number;
} | undefined;

interface WorldLike {
    batterys: unknown[];
    cheatMode?: {
        enabled: boolean;
        priceMultiplier: number;
    };
}

/**
 * BasicCannon - The most basic tower type
 */
export function BasicCannon(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "基础炮塔";
    res.levelUpArr = ['AncientCannon', 'TraditionalCannon', 'FutureCannon_1'];
    res.levelDownGetter = null;
    // Apply cheat mode price multiplier
    let priceAdded = typeof Functions !== 'undefined' ? Functions.TowerNumPriceAdded(world.batterys.length) : 0;
    if (world.cheatMode && world.cheatMode.enabled) {
        priceAdded = Math.floor(priceAdded * world.cheatMode.priceMultiplier);
    }
    res.price = 50 + priceAdded;
    res.comment = "最基础的炮塔，想获得厉害的炮塔就要从它开始进化，但是基础炮塔不太能无限获取，获取基础炮塔越多，需要的费用就越贵，其实只是在限制你不能在舞台上摆放太多的炮塔造成卡顿而已啦。";

    return res;
}

/**
 * AncientCannon - Medieval style tower
 */
export function AncientCannon(world: WorldLike): Tower {
    const res = new Tower(0, 0, world as any);
    res.name = "中世纪炮塔";
    res.r += 1;
    res.hpInit(2000);
    res.rangeR += 5;
    res.levelUpArr = ['Boomerang', 'ArrowBow_1', 'Hammer', 'StoneCannon'];
    res.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.littleStone as any : null;
    res.price = 60;
    res.levelDownGetter = 'BasicCannon';
    res.imgIndex = 1;
    res.comment = "从基础炮塔升到这一个炮塔之后，接下来的炮塔都是中世纪风格的炮塔。";

    return res;
}

// Register towers
TowerRegistry.register('BasicCannon', BasicCannon as any, { name: "基础炮塔", imgIndex: 0, basePrice: 50 });
TowerRegistry.register('AncientCannon', AncientCannon as any, { name: "中世纪炮塔", imgIndex: 1, basePrice: 60 });
