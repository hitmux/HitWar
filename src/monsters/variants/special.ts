/**
 * Special monster variants
 * Contains: Bulldozer, Glans, witch_N, bat, Spoke, SpokeMan (6)
 */
import { MyColor } from '../../entities/myColor';
import { Monster } from '../base/monster';
import { MonsterRegistry } from '../monsterRegistry';

interface WorldLike {
    [key: string]: unknown;
}

export function Bulldozer(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "排斥人";
    m.throwAble = true;
    m.addPrice += 10;
    m.speedNumb = 0.3;
    m.bodyColor = MyColor.arrTo([50, 30, 50, 1]);
    m.bodyStrokeColor = MyColor.arrTo([0, 0, 0, 1]);
    m.colishDamage = 10;
    m.haveGArea = true;
    m.gAreaR = 50;
    m.gAreaNum = -2;
    m.r = 25;
    m.imgIndex = 5;
    m.comment = "会把你的建筑推开，和黑洞相反";
    return m;
}

export function Glans(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "激光防御";
    m.addPrice += 10;
    m.speedNumb = 0.3;
    m.bodyColor = MyColor.arrTo([152, 118, 170, 1]);
    m.r = 30;
    m.haveLaserDefence = true;
    m.laserFreeze = 1;
    m.laserdefendPreNum = 10;
    m.maxLaserNum = 1000;
    m.laserDefendNum = 1000;
    m.laserRecoverFreeze = 100;
    m.laserRecoverNum = 20;
    m.laserRadius = 100;
    m.imgIndex = 6;
    m.comment = "有激光防御能力，就是能摧毁射过来的子弹，但是摧毁子弹需要激光能量，激光能量是有限的，弱点是非子弹类伤害";
    return m;
}

export function witch_N(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "召唤师";
    m.addPrice += 10;
    m.speedNumb = 0.3;
    m.bodyColor = MyColor.arrTo([152, 118, 170, 0.8]);
    m.bodyStrokeColor = MyColor.arrTo([152, 118, 170, 1]);
    m.bodyStrokeWidth = 5;
    m.r = 30;
    m.deadSummonAble = true;
    m.summonAble = true;
    m.summonCount = 4;
    m.summonDistance = Math.random() * 30 + 30;
    m.summonMonsterFunc = ((world: unknown) => MonsterRegistry.create('bat', world) as Monster) as any;
    m.imgIndex = 17;
    m.comment = "召唤师会不停的召唤小怪物";
    return m;
}

export function bat(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "小怪物";
    m.addPrice += 10;
    m.speedNumb = 3;
    m.bodyColor = MyColor.arrTo([152, 118, 170, 0.8]);
    m.bodyStrokeColor = MyColor.arrTo([152, 118, 170, 1]);
    m.bodyStrokeWidth = 5;
    m.accelerationV = 0.01;
    m.maxSpeedN = 5;
    m.r = 5;
    m.imgIndex = 18;
    m.comment = "快速飞到你的大本，对你的大本造成撞击伤害";
    return m;
}

export function Spoke(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "摇摆人";
    m.speedNumb = 3;
    m.changeSpeedFunc = m.selfSwingMove;
    m.imgIndex = 19;
    m.comment = "一种移动路径来回摇摆的普通人";
    return m;
}

export function SpokeMan(world: WorldLike): Monster {
    const m = Monster.randInit(world as any);
    m.name = "突进人";
    m.speedNumb = 3;
    m.changeSpeedFunc = m.selfSuddenlyMove;
    m.imgIndex = 20;
    m.comment = "一种路径来回前后突进的普通怪物";
    return m;
}

// Register monsters
MonsterRegistry.register('Bulldozer', Bulldozer as any);
MonsterRegistry.register('Glans', Glans as any);
MonsterRegistry.register('witch_N', witch_N as any);
MonsterRegistry.register('bat', bat as any);
MonsterRegistry.register('Spoke', Spoke as any);
MonsterRegistry.register('SpokeMan', SpokeMan as any);
