/**
 * Slime monster variants
 * Contains: Slime_L, Slime_M, Slime_S (3)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Slime_L(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "大史莱姆";
    m.addPrice += 10;
    m.speedNumb = 0.4;
    m.bodyColor = MyColor.arrTo([171, 236, 97, 0.8]);
    m.bodyStrokeColor = MyColor.arrTo([47, 113, 56, 1]);
    m.bodyStrokeWidth = 12;
    m.r = 50;
    m.deadSummonAble = true;
    m.summonMonsterFunc = ((world: unknown) => MonsterRegistry.create('Slime_M', world) as Monster) as any;
    m.imgIndex = 16;
    m.comment = "大型史莱姆，死亡之后会分裂成四个中型史莱姆，每个中型史莱姆死亡之后又会分裂成四个小型史莱姆";
    return m;
}

export function Slime_M(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "中史莱姆";
    m.addPrice += 10;
    m.speedNumb = 0.6;
    m.bodyColor = MyColor.arrTo([171, 236, 97, 0.8]);
    m.bodyStrokeColor = MyColor.arrTo([47, 113, 56, 1]);
    m.bodyStrokeWidth = 5;
    m.r = 30;
    m.deadSummonAble = true;
    m.summonMonsterFunc = ((world: unknown) => MonsterRegistry.create('Slime_S', world) as Monster) as any;
    m.imgIndex = 16;
    m.comment = "中型史莱姆，由大型史莱姆分裂得到";
    return m;
}

export function Slime_S(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "小史莱姆";
    m.addPrice += 10;
    m.speedNumb = 0.8;
    m.bodyColor = MyColor.arrTo([171, 236, 97, 0.8]);
    m.bodyStrokeColor = MyColor.arrTo([47, 113, 56, 1]);
    m.bodyStrokeWidth = 3;
    m.r = 10;
    m.imgIndex = 16;
    m.comment = "小型史莱姆，跑的比较快";
    return m;
}

// Register monsters
MonsterRegistry.register('Slime_L', Slime_L as any);
MonsterRegistry.register('Slime_M', Slime_M as any);
MonsterRegistry.register('Slime_S', Slime_S as any);
