/**
 * Cannon wiki interface
 */

import { TowerRegistry, TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT } from '../../towers/index';
import { setupBackButton } from '../components/backButton';
import { withInitGuard } from '../utils/initGuard';
import { createEntityCard, getAssetUrl } from '../components/entityCard';

interface TowerLike {
    name: string;
    rangeR: number;
    bullySpeed: number;
    clock: number;
    price: number;
    comment: string;
    imgIndex: number;
    levelUpArr: (string | ((world: unknown) => TowerLike))[] | null;
    getImgStartPosByIndex: (index: number) => { x: number; y: number };
}

type TowerCreator = (world: unknown) => TowerLike;

/**
 * Cannon interface logic
 */
export function cannonInterface(): void {
    const thisInterface = document.querySelector(".cannon-interface") as HTMLElement;

    withInitGuard('cannon-interface', () => {
        setupBackButton(thisInterface, "wiki-interface");
    });

    const contentEle = thisInterface.querySelector(".content") as HTMLElement;

    if (contentEle.children.length === 0) {
        try {
            const allTowerArr: TowerLike[] = [];

            // Get BasicCannon creator from registry
            const towerFunc = TowerRegistry.getCreator('BasicCannon') as TowerCreator | undefined;
            if (!towerFunc) {
                console.error('BasicCannon not found in registry');
                contentEle.innerHTML = '<p style="color: red;">Failed to load tower data</p>';
                return;
            }

            // Create a minimal mock world for tower creation
            const mockWorld = {
                width: 100,
                height: 100,
                batterys: [],
                buildings: [],
                monsters: new Set(),
                effects: new Set(),
                allBullys: new Set(),
                time: 0,
                energy: { getTotalProduction: () => 100, getTotalConsumption: () => 0 },
                territory: { contains: () => true },
                addTower: () => {},
                addBuilding: () => {},
                addMonster: () => {},
                addEffect: () => {},
                addBully: () => {},
                removeBully: () => {}
            };

            const dfs = (tf: TowerCreator) => {
                try {
                    const t = tf(mockWorld);
                    allTowerArr.push(t);
                    if (t.levelUpArr === null || t.levelUpArr === undefined || t.levelUpArr.length === 0) {
                        return;
                    }
                    for (const item of t.levelUpArr) {
                        let nextFunc: TowerCreator | undefined;
                        if (typeof item === 'string') {
                            nextFunc = TowerRegistry.getCreator(item) as TowerCreator | undefined;
                        } else if (typeof item === 'function') {
                            nextFunc = item as TowerCreator;
                        }
                        if (nextFunc) {
                            dfs(nextFunc);
                        }
                    }
                } catch (e) {
                    console.error('Error creating tower:', e);
                }
            };
            dfs(towerFunc);

            const towerImgUrl = getAssetUrl("/towers/imgs/towers.png");

            for (const towerObj of allTowerArr) {
                const card = createEntityCard({
                    className: "tower",
                    title: towerObj.name,
                    image: {
                        url: towerImgUrl,
                        width: TOWER_IMG_PRE_WIDTH,
                        height: TOWER_IMG_PRE_HEIGHT,
                        index: towerObj.imgIndex,
                        getPosition: towerObj.getImgStartPosByIndex
                    },
                    dataItems: [
                        { label: "射程", value: towerObj.rangeR + "px" },
                        { label: "子弹速度", value: towerObj.bullySpeed },
                        { label: "血量", value: towerObj.rangeR },
                        { label: "攻击间歇时间", value: towerObj.clock },
                        { label: "价格", value: towerObj.price },
                        { label: "详细信息", value: towerObj.comment }
                    ]
                });

                // Add empty common div for consistency
                const common = document.createElement("div");
                card.appendChild(common);

                contentEle.appendChild(card);
            }
        } catch (e) {
            console.error('Error initializing cannon interface:', e);
            contentEle.innerHTML = '<p style="color: red;">Failed to load tower data: ' + e + '</p>';
        }
    }
}
