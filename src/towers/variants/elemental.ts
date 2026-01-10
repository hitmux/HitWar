/**
 * Elemental tower variants
 *
 * Contains: Flamethrower_1~2, FrozenCannon_1~2, Poison_1~2, PowderCannon (7 towers)
 */
import { Tower } from '../base/tower';
import { TowerRegistry } from '../towerRegistry';

// BullyFinally will be resolved from global scope
declare const BullyFinally: {
    Powder: (() => unknown) | null;
    Fire_L: (() => unknown) | null;
    Fire_LL: (() => unknown) | null;
    Frozen_L: (() => unknown) | null;
    P_L: (() => unknown) | null;
    P_M: (() => unknown) | null;
} | undefined;

interface WorldLike {
    batterys: unknown[];
}

export function PowderCannon(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "粉尘炮塔";
    b.r += 5;
    b.rangeR = 150;
    b.bullySpeed = 10;
    b.clock = 1;
    (b as any).laserBaseDamage = 10;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Powder as any : null;
    b.bullyDeviationRotate = 3;

    b.levelDownGetter = 'TraditionalCannon_MultiTube';
    b.levelUpArr = ['Flamethrower_1', 'FrozenCannon_1', 'Poison_1'];
    b.imgIndex = 36;
    b.price = 260;
    b.comment = `这个炮塔发射的是呛人的瓦斯烟雾，同时也是为了进化成发射粉尘类，烟雾类等等的炮塔而过渡`;
    b.audioSrcString = "/sound/子弹音效/烟雾.mp3";
    return b;
}

export function Flamethrower_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级喷火器";
    b.r += 7;
    b.rangeR = 200;
    b.bullySpeed = 15;
    b.clock = 1;

    b.hpInit(5000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Fire_L as any : null;
    b.attackBullyNum = 2;
    b.bullyDeviationRotate = 4;
    b.price = 1000;
    b.levelDownGetter = 'PowderCannon';
    b.levelUpArr = ['Flamethrower_2'];
    b.imgIndex = 37;
    b.price = 420;
    b.comment = `喷射火焰，让敌人持续受到伤害，同时让敌人获得烧伤效果，敌人获得烧伤效果之后会按照比例持续掉血，血量再厚的敌人也撑不过多久，坏处就是烧伤会让敌人加速`;
    return b;
}

export function Flamethrower_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级喷火器";
    b.r += 9;
    b.rangeR = 200;
    b.bullySpeed = 18;
    b.clock = 1;

    b.hpInit(10000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Fire_LL as any : null;
    b.attackBullyNum = 2;
    b.bullyDeviationRotate = 4;
    b.price = 8000;
    b.levelDownGetter = 'Flamethrower_1';
    b.levelUpArr = [];
    b.imgIndex = 37;
    b.price = 500;
    b.comment = `喷射的火焰采用了冷火焰，好处是让敌人加速的不那么快了，伤害丝毫不会打折扣`;
    return b;
}

export function FrozenCannon_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级冰冻炮";
    b.rangeR = 150;
    b.r += 7;

    b.bullySpeed = 4;
    b.bullySlideRate = 1;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Frozen_L as any : null;
    b.clock = 10;
    b.hpInit(2000);
    b.price = 6000;
    b.levelDownGetter = 'PowderCannon';
    b.levelUpArr = ['FrozenCannon_2'];
    b.imgIndex = 39;
    b.price = 620;
    b.comment = `击中之后的冰冻蛋子会发生小爆炸，爆炸范围内的敌人会减速，这个减速效果可以累加，直到达到一个上限。但是冰冻和烧伤是互斥的，二者不能同时存在`;
    b.audioSrcString = "/sound/子弹音效/冰冻.mp3";
    return b;
}

export function FrozenCannon_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级冰冻炮";
    b.rangeR = 200;
    b.r += 8;

    b.bullySpeed = 6;
    b.bullySlideRate = 1;
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.Frozen_L as any : null;
    b.clock = 3;
    b.hpInit(3000);
    b.price = 8000;
    b.attackBullyNum = 3;
    b.bullyDeviationRotate = 5;
    b.levelUpArr = [];
    b.levelDownGetter = 'FrozenCannon_1';
    b.imgIndex = 39;
    b.price = 1200;
    b.comment = `迅速发射大量更密集的冰冻蛋子`;
    b.audioSrcString = "/sound/子弹音效/冰冻.mp3";
    return b;
}

export function Poison_1(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "1级毒气喷射器";
    b.r += 8;
    b.rangeR = 250;
    b.bullySpeed = 9;
    b.clock = 10;

    b.hpInit(10000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.P_L as any : null;
    b.attackBullyNum = 10;
    b.bullyDeviationRotate = 8;
    b.price = 3000;
    b.levelDownGetter = 'PowderCannon';
    b.levelUpArr = ['Poison_2'];
    b.imgIndex = 38;
    b.price = 400;
    b.comment = `被毒气烟雾熏到的敌人会受到伤害`;
    return b;
}

export function Poison_2(world: WorldLike): Tower {
    const b = new Tower(0, 0, world as any);
    b.name = "2级毒气喷射器";
    b.r += 9.5;
    b.rangeR = 260;
    b.bullySpeed = 9;
    b.clock = 13;

    b.hpInit(15000);
    b.getmMainBullyFunc = typeof BullyFinally !== 'undefined' ? BullyFinally.P_M as any : null;
    b.attackBullyNum = 10;
    b.bullyDeviationRotate = 8;
    b.price = 3000;
    b.levelUpArr = [];
    b.levelDownGetter = 'Poison_1';
    b.imgIndex = 38;
    b.price = 600;
    b.comment = `毒气伤害增加`;
    return b;
}

// Register towers
TowerRegistry.register('PowderCannon', PowderCannon as any, { name: "粉尘炮塔", imgIndex: 36, basePrice: 260 });
TowerRegistry.register('Flamethrower_1', Flamethrower_1 as any, { name: "1级喷火器", imgIndex: 37, basePrice: 420 });
TowerRegistry.register('Flamethrower_2', Flamethrower_2 as any, { name: "2级喷火器", imgIndex: 37, basePrice: 500 });
TowerRegistry.register('FrozenCannon_1', FrozenCannon_1 as any, { name: "1级冰冻炮", imgIndex: 39, basePrice: 620 });
TowerRegistry.register('FrozenCannon_2', FrozenCannon_2 as any, { name: "2级冰冻炮", imgIndex: 39, basePrice: 1200 });
TowerRegistry.register('Poison_1', Poison_1 as any, { name: "1级毒气喷射器", imgIndex: 38, basePrice: 400 });
TowerRegistry.register('Poison_2', Poison_2 as any, { name: "2级毒气喷射器", imgIndex: 38, basePrice: 600 });
