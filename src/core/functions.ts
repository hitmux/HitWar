/**
 * Game balance functions
 * by littlefean
 */
export class Functions {
    /**
     * Monster HP increase based on world tick
     */
    static timeMonsterHp(t: number): number {
        return t / 3;
    }

    static timeMonsterAtt(t: number): number {
        return t / 5;
    }

    /**
     * Monster spawn count based on time
     */
    static timeMonsterAddedNum(t: number): number {
        const res = Math.floor(Math.pow(t / 20, 0.2));
        return res < 0 ? 1 : res;
    }

    /**
     * Total monsters in wave n
     */
    static levelMonsterFlowNum(level: number): number {
        let res = Math.floor(Math.pow(level / 2, 1.1)) + 2;
        res += Math.log(level + 1) * 5;
        res = Math.floor(res);
        return res <= 0 ? 1 : res;
    }

    static levelMonsterFlowNumHard(level: number): number {
        let res = Math.floor(Math.pow(level / 2, 1.35)) + 2;
        res += Math.log(level + 1) * 10;
        res = Math.floor(res);
        return res <= 0 ? 1 : res;
    }

    /**
     * Effect alpha based on progress
     * @param tr effect progress 0~1
     */
    static timeRateAlpha(tr: number): number {
        return (1 - tr) * 0.25;
    }

    static timeRateAlphaDownFast(tr: number): number {
        return Math.pow((1 - tr) * 0.25, 2);
    }

    /**
     * Explosion damage falloff with distance
     */
    static disBoomDamage(dis: number): void {
        // Not implemented
    }

    /**
     * Monster kill reward based on time
     */
    static timeAddPrise(tick: number): number {
        let res = Math.floor(Math.log10(tick));
        if (res <= 0) {
            res = 1;
        }
        return res;
    }

    /**
     * Monster HP cap based on wave
     */
    static levelMonsterHpAddedHard(level: number): number {
        return Math.floor(Math.pow(level, 2.7) + Math.pow(level, 0.5) * 60);
    }

    static levelMonsterHpAddedNormal(level: number): number {
        let res = Math.floor(Math.pow(level, 2.5) + Math.pow(level, 0.5) * 60);
        if (res > 100000) {
            res = 100000;
        }
        return res;
    }

    static levelMonsterHpAddedEasy(level: number): number {
        let res = Math.floor(Math.pow(level, 2) + Math.pow(level, 0.5) * 60);
        if (res > 5000) {
            res = 5000;
        }
        return res;
    }

    /**
     * Monster HP increase based on tick
     */
    static tickMonsterHpAddedEasy(t: number): number {
        return Math.floor(Math.pow(t / 500, 2.5) + Math.pow(t / 500, 0.5) * 60);
    }

    static tickMonsterHpAddedHard(t: number): number {
        return Math.floor(Math.pow(t / 500, 2.52) + Math.pow(t / 500, 0.5) * 60);
    }

    /**
     * Monster spawn count per tick (endless mode)
     */
    static tickAddMonsterNumEasy(t: number): number {
        return Math.floor(t / 200);
    }

    static tickAddMonsterNumHard(t: number): number {
        return Math.floor(t / 180);
    }

    /**
     * T800 count based on wave
     */
    static levelT800Count(level: number): number {
        const res = Math.floor(Math.pow(level, 1.2) / 10);
        return res < 1 ? 1 : res;
    }

    static levelT800CountHard(level: number): number {
        const res = Math.floor(Math.pow(level, 1.5) / 10);
        return res < 1 ? 1 : res;
    }

    /**
     * Monster kill reward based on wave
     */
    static levelAddPrice(level: number): number {
        return Math.floor(Math.log(level) * (level / 10)) + 10;
    }

    static levelAddPriceNormal(level: number): number {
        return Math.floor(Math.log(level) * (level / 10));
    }

    static levelAddPriceHard(level: number): number {
        return Math.floor(Math.log(level) * (level / 20));
    }

    /**
     * Hell tower damage based on lock time
     */
    static timeHellTowerDamage_E(tick: number): number {
        return Math.exp(tick) / 100000_0000;
    }

    static timeHellTowerDamage(tick: number): number {
        return Math.pow(tick, 2) / 1000;
    }

    /**
     * Monster collision damage based on wave
     */
    static levelCollideAdded(level: number): number {
        return Math.floor(Math.pow(level, 1.55));
    }

    static levelCollideAddedHard(level: number): number {
        return Math.floor(Math.pow(level, 2));
    }

    /**
     * Tower price increase based on count
     */
    static TowerNumPriceAdded(num: number): number {
        if (num < 8) return 0;
        const n = num - 7;
        return Math.floor(n * n * n * n / 3);
    }

    static TowerNumPriceAdded2(num: number): number {
        let x = num - 6;
        if (x < 0) {
            x = 0;
        }
        return Math.floor(Math.pow(x, 1.7));
    }
}
