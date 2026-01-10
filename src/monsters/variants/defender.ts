/**
 * Defender monster variants
 * Contains: BulletWearer, BulletRepellent, DamageReducers, BlackHole (4)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function BulletWearer(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "子弹削子";
    m.addPrice += 5;
    m.speedNumb = 0.35;
    m.bodyColor = MyColor.arrTo([62, 134, 160, 1]);
    m.haveBullyChangeArea = true;
    m.bullyChangeDetails.r = 100;
    m.bullyChangeDetails.f = 5;
    m.bullyChangeDetails.bullyDR = -1;
    m.imgIndex = 12;
    m.comment = "自身会有一个场，这个场里的子弹会不停的减少子弹半径";
    return m;
}

export function BulletRepellent(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "子弹排斥";
    m.addPrice += 5;
    m.speedNumb = 0.25;
    m.bodyColor = MyColor.arrTo([186, 166, 128, 1]);
    m.haveBullyChangeArea = true;
    m.bullyChangeDetails.r = 150;
    m.bullyChangeDetails.f = 1;
    m.bullyChangeDetails.bullyAN = 1;
    m.imgIndex = 13;
    m.comment = "自身会有一个排斥子弹的场，能够把场内的飞过来的子弹向外排斥，改变子弹的轨迹，只是对子弹有效果，对激光和其他武器没有效果";
    return m;
}

export function DamageReducers(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "子弹削弱";
    m.addPrice += 5;
    m.speedNumb = 0.35;
    m.bodyColor = MyColor.arrTo([190, 145, 23, 1]);
    m.haveBullyChangeArea = true;
    m.bullyChangeDetails.r = 150;
    m.bullyChangeDetails.f = 1;
    m.bullyChangeDetails.bullyDD = -1;
    m.imgIndex = 14;
    m.comment = "能够对自身一定范围内的区域内的所有子弹减少伤害，伤害小的子弹比如小枪的子弹可能就没有伤害了。";
    return m;
}

export function BlackHole(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "黑洞";
    m.throwAble = true;
    m.addPrice += 10;
    m.speedNumb = 0.2;
    m.bodyColor = MyColor.arrTo([0, 0, 0, 1]);
    m.bodyStrokeColor = MyColor.arrTo([0, 0, 0, 1]);
    m.colishDamage = 10;
    m.haveGArea = true;
    m.gAreaR = 160;
    m.gAreaNum = 2;
    m.r = 30;
    m.imgIndex = 4;
    m.comment = "会把你的建筑吸走";
    return m;
}

// Register monsters
MonsterRegistry.register('BulletWearer', BulletWearer as any);
MonsterRegistry.register('BulletRepellent', BulletRepellent as any);
MonsterRegistry.register('DamageReducers', DamageReducers as any);
MonsterRegistry.register('BlackHole', BlackHole as any);
