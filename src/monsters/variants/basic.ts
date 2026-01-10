/**
 * Basic monster variants
 * Contains: Normal, Runner, TestMonster, Ox1~3 (6)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Normal(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.speedNumb = 0.3;
    m.comment = "普通人";
    return m;
}

export function Runner(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.speedNumb = 1;
    m.comment = "跑人";
    return m;
}

export function TestMonster(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "测试";
    m.hpInit(1);
    m.colishDamage = 0;
    m.addPrice = 10;
    m.comment = "这个是程序测试用的";
    return m;
}

export function Ox1(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "冲锋1级";
    m.bodyColor = MyColor.arrTo([80, 20, 20, 1]);
    m.speedNumb = 0.01;
    m.accelerationV = 0.01;
    m.maxSpeedN = 5;
    m.imgIndex = 1;
    m.comment = "速度会越来越快";
    return m;
}

export function Ox2(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "冲锋2级";
    m.bodyColor = MyColor.arrTo([120, 20, 20, 1]);
    m.speedNumb = 0.01;
    m.accelerationV = 0.05;
    m.maxSpeedN = 7;
    m.imgIndex = 1;
    m.comment = "加速度，速度越来越快";
    return m;
}

export function Ox3(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "冲锋3级";
    m.bodyColor = MyColor.arrTo([150, 20, 20, 1]);
    m.speedNumb = 0.01;
    m.accelerationV = 0.1;
    m.maxSpeedN = 10;
    m.imgIndex = 1;
    m.comment = "比普通冲锋加速的更快";
    return m;
}

// Register monsters
MonsterRegistry.register('Normal', Normal as any);
MonsterRegistry.register('Runner', Runner as any);
MonsterRegistry.register('TestMonster', TestMonster as any);
MonsterRegistry.register('Ox1', Ox1 as any);
MonsterRegistry.register('Ox2', Ox2 as any);
MonsterRegistry.register('Ox3', Ox3 as any);
