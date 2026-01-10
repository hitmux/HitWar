/**
 * MonsterGroup - Monster wave management
 * by littlefean
 */
import { Vector } from '../core/math/vector';
import { MonsterRegistry } from './monsterRegistry';
import { Monster } from './base/monster';
import { MonsterShooter } from './base/monsterShooter';

// Declare globals for non-migrated modules
declare const EffectText: new (text: string) => EffectTextLike | undefined;

declare const Functions: {
    levelMonsterFlowNum(level: number): number;
    levelMonsterFlowNumHard(level: number): number;
    levelT800Count(level: number): number;
    levelT800CountHard(level: number): number;
    levelMonsterHpAddedEasy(level: number): number;
    levelMonsterHpAddedNormal(level: number): number;
    levelMonsterHpAddedHard(level: number): number;
    levelCollideAdded(level: number): number;
    levelCollideAddedHard(level: number): number;
    levelAddPrice(level: number): number;
    levelAddPriceNormal(level: number): number;
    levelAddPriceHard(level: number): number;
} | undefined;

interface EffectTextLike {
    textSize: number;
    duration: number;
    pos: Vector;
}

interface WorldLike {
    width: number;
    height: number;
    monsters: Set<Monster>;
    maxMonsterNum: number;
    addEffect(effect: unknown): void;
}

type GameMode = "easy" | "normal" | "hard";

// Monster arrays for different game modes
const MonsterEasyArr: string[] = [
    'Ox1', 'Ox2', 'Ox3', 'Runner',
    'Bomber1', 'Slime_S', 'Slime_M', 'Slime_L',
    'Medic', 'Medic_S'
];

const Monster10BeforeArr: string[] = [
    'Normal', 'Runner', 'Ox1', 'Ox2',
    'Bomber1', 'Thrower1', 'Bulldozer',
    'Medic', 'Medic_M', 'Medic_S',
    'AttackAdder', 'SpeedAdder',
    'Shouter', 'Shouter_Spike'
];

const MonsterAllArr: string[] = [
    'Ox1', 'Ox2', 'Ox3', 'Runner',
    'Bomber1', 'Bomber2', 'Bomber3',
    'Thrower1', 'BlackHole', 'Bulldozer', 'Glans',
    'Medic', 'Medic_M', 'Medic_S',
    'AttackAdder', 'SpeedAdder',
    'BulletWearer', 'BulletRepellent', 'DamageReducers',
    'Shouter', 'Shouter_Stone', 'Shouter_Bomber', 'Shouter_Spike',
    'Slime_L', 'witch_N', 'bat',
    'Spoke', 'SpokeMan', 'Exciting', 'Visitor',
    'Enderman', 'Mts'
];

export class MonsterGroup {
    world: WorldLike;
    kinds: string[];
    kindCount: number[];
    monsterCount: number;
    level: number;
    delayTick: number;
    state: number;

    constructor(world: WorldLike) {
        this.world = world;
        this.kinds = [];
        this.kindCount = [];
        this.monsterCount = 0;
        this.level = 0;
        for (let n of this.kindCount) {
            this.monsterCount += n;
        }
        this.delayTick = 200;
        this.state = 0;
    }

    copySelf(): MonsterGroup {
        let res = new MonsterGroup(this.world);
        res.kinds = [];
        res.kindCount = [];
        for (let item of this.kinds) {
            res.kinds.push(item);
        }
        for (let item of this.kindCount) {
            res.kindCount.push(item);
        }
        res.monsterCount = this.monsterCount;
        res.level = this.level;
        return res;
    }

    updateCount(): void {
        for (let n of this.kindCount) {
            this.monsterCount += n;
        }
    }

    static getMonsterFlow(world: WorldLike, level: number, modeStr: GameMode): MonsterGroup {
        let res = new this(world);
        res.level = level;
        res.kinds = [];
        res.kindCount = [];

        const choice = <T>(arr: T[]): T => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        let monsterArr: string[];
        if (level < 15) {
            monsterArr = Monster10BeforeArr;
        } else {
            monsterArr = MonsterAllArr;
        }
        if (modeStr === "easy") {
            monsterArr = MonsterEasyArr;
        }

        // T800 boss wave: starting from level 15, every 10 waves (15, 25, 35...)
        const isT800Wave = level >= 15 && (level - 15) % 10 === 0;

        if (isT800Wave) {
            if (modeStr === "easy") {
                let sumNum = typeof Functions !== 'undefined' ? Functions.levelMonsterFlowNum(level) : 10;
                for (let i = 0; i < 5; i++) {
                    res.kinds.push(choice(monsterArr));
                    res.kindCount.push(Math.floor(sumNum / 3));
                }
            } else {
                // normal and hard mode spawn T800
                let sumNum: number;
                if (modeStr === "normal") {
                    sumNum = typeof Functions !== 'undefined' ? Functions.levelT800Count(level) : 5;
                } else {
                    sumNum = typeof Functions !== 'undefined' ? Functions.levelT800CountHard(level) : 10;
                }
                res.kinds.push('T800');
                res.kindCount.push(sumNum);
            }
        } else if (level % 5 === 0) {
            let sumNum: number;
            let kindNum: number;
            if (modeStr === "normal" || modeStr === "easy") {
                sumNum = typeof Functions !== 'undefined' ? Functions.levelMonsterFlowNum(level) : 15;
                kindNum = 3;
            } else {
                sumNum = typeof Functions !== 'undefined' ? Functions.levelMonsterFlowNumHard(level) : 30;
                kindNum = 8;
            }
            for (let i = 0; i < kindNum; i++) {
                res.kinds.push(choice(monsterArr));
                res.kindCount.push(Math.floor(sumNum / 3));
            }
        } else {
            let sumNum: number;
            let kindNum: number;
            if (modeStr === "normal" || modeStr === "easy") {
                sumNum = typeof Functions !== 'undefined' ? Functions.levelMonsterFlowNum(level) : 10;
                kindNum = 2;
            } else {
                sumNum = typeof Functions !== 'undefined' ? Functions.levelMonsterFlowNumHard(level) : 20;
                kindNum = 5;
            }
            for (let i = 0; i < kindNum; i++) {
                res.kinds.push(choice(monsterArr));
                res.kindCount.push(Math.floor(sumNum / 2));
            }
        }
        res.updateCount();
        return res;
    }

    couldNextFlow(): boolean {
        return this.world.monsters.size === 0;
    }

    couldBegin(): boolean {
        if (this.world.monsters.size === 0) {
            this.state = 1;
            if (this.delayTick <= 0) {
                return true;
            } else {
                this.delayTick--;
            }
        } else {
            this.state = 0;
        }
        return false;
    }

    addToWorld(modeStr: GameMode): void {
        if (this.couldBegin()) {
            if (typeof EffectText !== 'undefined') {
                let et = new EffectText(`第 ${this.level} 波`);
                if (et) {
                    et.textSize = 40;
                    et.duration = 100;
                    et.pos = new Vector(this.world.width / 2, this.world.height / 2);
                    this.world.addEffect(et);
                }
            }

            for (let i = 0; i < this.kinds.length; i++) {
                let kindName = this.kinds[i];
                let count = this.kindCount[i];
                for (let j = 0; j < count; j++) {
                    let m = MonsterRegistry.create(kindName, this.world) as Monster | null;
                    if (!m) continue;

                    // Reduce shooter range in early waves (level < 15)
                    if (this.level < 15 && m instanceof MonsterShooter) {
                        m.rangeR = Math.floor(m.rangeR * 2 / 3);
                    }

                    if (modeStr === "easy") {
                        if (typeof Functions !== 'undefined') {
                            m.hpInit(m.maxHp + Functions.levelMonsterHpAddedEasy(this.level));
                            m.addPrice += Functions.levelAddPrice(this.level);
                        }
                    } else if (modeStr === "normal") {
                        if (typeof Functions !== 'undefined') {
                            m.hpInit(m.maxHp + Functions.levelMonsterHpAddedNormal(this.level));
                            m.colishDamage += Functions.levelCollideAdded(this.level);
                            m.addPrice += Functions.levelAddPriceNormal(this.level);
                        }
                    } else if (modeStr === "hard") {
                        if (typeof Functions !== 'undefined') {
                            m.hpInit(m.maxHp + Functions.levelMonsterHpAddedHard(this.level));
                            m.colishDamage += Functions.levelCollideAddedHard(this.level);
                            m.addPrice += Functions.levelAddPriceHard(this.level);
                        }
                    }
                    if (this.world.monsters.size < this.world.maxMonsterNum) {
                        this.world.monsters.add(m);
                    }
                }
            }
        }
    }

    toString(): string {
        let text1 = "";
        for (let kindName of this.kinds) {
            let m = MonsterRegistry.create(kindName, this.world) as Monster | null;
            if (m) {
                text1 += m.name + "、";
            }
        }
        text1 += `，共${this.monsterCount}个`;
        return text1;
    }
}

// Export monster arrays for external use
export { MonsterEasyArr, Monster10BeforeArr, MonsterAllArr };
