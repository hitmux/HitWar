/**
 * Building Variants - Specific building implementations
 *
 * by littlefean
 */
import { Vector } from '../../core/math/vector';
import { MyColor } from '../../entities/myColor';
import { Building } from '../building';
import { BuildingRegistry } from '../buildingRegistry';

interface WorldLike {
    [key: string]: unknown;
}

/**
 * Root Building (Headquarters)
 */
export function Root(world: WorldLike): Building {
    const res = new Building(Vector.zero(), world as any);
    res.name = "Headquarters";
    res.r = 20;
    res.hpInit(10000);

    res.bodyStrokeColor = new MyColor(0, 0, 0, 1);
    res.bodyStrokeWidth = 5;
    res.bodyColor = new MyColor(50, 50, 50, 1);
    return res;
}

/**
 * Gold Mine (Collector)
 */
export function Collector(world: WorldLike): Building {
    const res = new Building(Vector.zero(), world as any);
    res.name = "金矿";
    res.moneyAddedAble = true;
    res.moneyAddedNum = 50;
    res.moneyAddedFreezeTime = 2000;
    res.r = 15;
    res.hpInit(3000);

    res.price = 800;

    res.bodyStrokeColor = new MyColor(0, 0, 0, 1);
    res.bodyStrokeWidth = 1;
    res.bodyColor = new MyColor(0, 0, 0, 0);
    return res;
}

/**
 * Treatment Tower (Repair Tower)
 */
export function Treatment(world: WorldLike): Building {
    const res = new Building(Vector.zero(), world as any);
    res.name = "维修塔";
    res.otherHpAddAble = true;
    res.otherHpAddNum = 200;
    res.otherHpAddRadius = 120;
    res.otherHpAddFreezeTime = 100;
    res.r = 10;
    res.hpInit(7500);
    res.price = 1200;

    res.bodyStrokeColor = new MyColor(0, 0, 0, 1);
    res.bodyStrokeWidth = 1;
    res.bodyColor = new MyColor(25, 25, 25, 0.8);
    return res;
}

// Register all building variants
BuildingRegistry.register('Root', Root as any);
BuildingRegistry.register('Collector', Collector as any);
BuildingRegistry.register('Treatment', Treatment as any);
