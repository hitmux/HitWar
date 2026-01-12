/**
 * BulletLauncher - Bullet launcher class
 * todo: Bullet launcher needs a faction class, e.g.: PlayerA, PlayerB, AiA, AiB, Attacker, Defender
 *
 * by littlefean
 */
import { Vector } from '../core/math/vector';
import { BulletRegistry } from './bulletRegistry';
import { Bully } from './bullet';
import { scaleSpeed, scalePeriod } from '../core/speedScale';

interface BindObjectLike {
    liveTime: number;
}

interface WorldLike {
    // World interface placeholder
}

type LauncherObjGetterFunc = () => Bully | null;

export class BulletLauncher {
    bindObject: BindObjectLike;
    world: WorldLike;
    pos: Vector;

    clock: number;
    launcherObjGetterFunc: LauncherObjGetterFunc;

    bullySpeed: number;
    bullySpeedAddMax: number;
    bullyDeviationRotate: number;
    bullyDeviation: number;
    bullyRotate: number;
    attackBullyNum: number;
    bullySlideRate: number;

    lunchRange: number;

    constructor(pos: Vector, world: WorldLike, bindObject: BindObjectLike) {
        this.bindObject = bindObject;
        this.world = world;
        this.pos = pos;  // Launch origin position

        this.clock = scalePeriod(5);  // Reaction time
        this.launcherObjGetterFunc = () => BulletRegistry.create('Normal') as Bully | null;

        this.bullySpeed = scaleSpeed(8);  // Bullet base speed
        this.bullySpeedAddMax = 0;  // Bullet speed random increase
        this.bullyDeviationRotate = 0;  // Bullet plane random offset (direction)
        this.bullyDeviation = 0;  // Bullet plane random offset
        /**
         * Shotgun single-side angle
         */
        this.bullyRotate = 0;
        this.attackBullyNum = 1;  // Number of bullets per shot
        this.bullySlideRate = 1;  // Bullet slide distance

        this.lunchRange = 100;  // Range
    }

    /**
     * Iterate launcher once
     */
    goStepLauncher(): void {
        if (this.bindObject.liveTime % this.clock !== 0) {
            return;
        }
    }
}
