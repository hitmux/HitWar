/**
 * Monsters wiki interface
 */

import { getMonsterFuncArr, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../../monsters/index';
import { setupBackButton } from '../components/backButton';
import { withInitGuard } from '../utils/initGuard';
import { createEntityCard, getAssetUrl } from '../components/entityCard';

interface MonsterLike {
    name: string;
    maxHp: number;
    addPrice: number;
    colishDamage: number;
    speedNumb: number;
    accelerationV: number;
    comment: string;
    imgIndex: number;
    getImgStartPosByIndex: (index: number) => { x: number; y: number };
}

/**
 * Monsters interface logic
 */
export function monstersInterface(): void {
    const thisInterface = document.querySelector(".monsters-interface") as HTMLElement;

    withInitGuard('monsters-interface', () => {
        setupBackButton(thisInterface, "wiki-interface");
    });

    const contentEle = thisInterface.querySelector(".content") as HTMLElement;

    // Create a minimal mock world for monster creation
    const mockWorld = {
        width: 100,
        height: 100,
        batterys: [],
        buildings: [],
        monsters: new Set(),
        effects: new Set(),
        allBullys: new Set(),
        time: 0,
        rootBuilding: { pos: { x: 50, y: 50 } },
        addMonster: () => {},
        addEffect: () => {}
    };

    if (contentEle.children.length === 0) {
        try {
            const MONSTERS_FUNC_ARR_ALL = getMonsterFuncArr();
            const monsterImgUrl = getAssetUrl("/monster/imgs/monsters.png");

            for (const monster of MONSTERS_FUNC_ARR_ALL) {
                try {
                    const monsterObj = (monster as (world: unknown) => MonsterLike)(mockWorld);
                    const card = createEntityCard({
                        className: "monster",
                        title: monsterObj.name,
                        image: {
                            url: monsterImgUrl,
                            width: MONSTER_IMG_PRE_WIDTH,
                            height: MONSTER_IMG_PRE_HEIGHT,
                            index: monsterObj.imgIndex,
                            getPosition: monsterObj.getImgStartPosByIndex
                        },
                        dataItems: [
                            { label: "血量", value: monsterObj.maxHp },
                            { label: "奖金", value: monsterObj.addPrice },
                            { label: "碰撞伤害", value: monsterObj.colishDamage },
                            { label: "速度", value: monsterObj.speedNumb },
                            { label: "加速度", value: monsterObj.accelerationV },
                            { label: "介绍", value: monsterObj.comment }
                        ]
                    });
                    contentEle.appendChild(card);
                } catch (e) {
                    console.error('Error creating monster:', e);
                }
            }
        } catch (e) {
            console.error('Error initializing monsters interface:', e);
            contentEle.innerHTML = '<p style="color: red;">Failed to load monster data: ' + e + '</p>';
        }
    }
}
