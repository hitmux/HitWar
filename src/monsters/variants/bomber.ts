/**
 * Bomber monster variants
 * Contains: Bomber1~3, Thrower1 (4)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Bomber1(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "炸弹1级";
    m.bodyColor = MyColor.arrTo([60, 60, 20, 1]);
    m.speedNumb = 0.5;
    m.bombSelfAble = true;
    m.bombSelfRange = 80;
    m.bombSelfDamage = 200;
    m.imgIndex = 2;
    m.comment = "死了会爆炸";
    return m;
}

export function Bomber2(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "炸弹2级";
    m.bodyColor = MyColor.arrTo([90, 90, 30, 1]);
    m.addPrice += 10;
    m.speedNumb = 0.55;
    m.bombSelfAble = true;
    m.bombSelfRange = 120;
    m.bombSelfDamage = 800;
    m.imgIndex = 2;
    m.comment = "爆炸伤害更大";
    return m;
}

export function Bomber3(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "炸弹3级";
    m.bodyColor = MyColor.arrTo([150, 150, 50, 1]);
    m.addPrice += 10;
    m.speedNumb = 0.6;
    m.bombSelfAble = true;
    m.bombSelfRange = 200;
    m.bombSelfDamage = 5000;
    m.imgIndex = 2;
    m.comment = "爆炸伤害更更大";
    return m;
}

export function Thrower1(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "压路机1级";
    m.throwAble = true;
    m.bodyColor = MyColor.arrTo([50, 150, 150, 0.5]);
    m.bodyStrokeColor = MyColor.arrTo([5, 15, 15, 1]);
    m.addPrice += 10;
    m.speedNumb = 0.4;
    m.r = 30;
    m.colishDamage /= 1;
    m.imgIndex = 3;
    m.comment = "直接碾压你的建筑，伤害很大";
    return m;
}

// Register monsters
MonsterRegistry.register('Bomber1', Bomber1 as any);
MonsterRegistry.register('Bomber2', Bomber2 as any);
MonsterRegistry.register('Bomber3', Bomber3 as any);
MonsterRegistry.register('Thrower1', Thrower1 as any);
