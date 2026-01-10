/**
 * Cannon wiki interface
 */

import { gotoPage } from '../navigation/router';
import { TowerRegistry, TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT } from '../../towers/index';

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

// Flag to prevent multiple event bindings
let isInitialized = false;

/**
 * Cannon interface logic
 */
export function cannonInterface(): void {
    let thisInterface = document.querySelector(".cannon-interface") as HTMLElement;

    // Only add event listener once
    if (!isInitialized) {
        thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
            gotoPage("wiki-interface");
        });
        isInitialized = true;
    }

    let contentEle = thisInterface.querySelector(".content") as HTMLElement;

    if (contentEle.children.length === 0) {
        try {
            let allTowerArr: TowerLike[] = [];

            // Get BasicCannon creator from registry
            let towerFunc = TowerRegistry.getCreator('BasicCannon') as TowerCreator | undefined;
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

            let dfs = (tf: TowerCreator) => {
                try {
                    let t = tf(mockWorld);
                    allTowerArr.push(t);
                    if (t.levelUpArr === null || t.levelUpArr === undefined || t.levelUpArr.length === 0) {
                        return;
                    }
                    for (let item of t.levelUpArr) {
                        // levelUpArr contains tower names (strings), not functions
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

            for (let towerObj of allTowerArr) {
                // Tower div
                let towerEle = document.createElement("div");
                towerEle.classList.add("tower");
                // Title
                let title = document.createElement("h3");
                title.innerText = towerObj.name;
                towerEle.appendChild(title);
                // Image
                let towerImg = document.createElement("div");
                towerImg.style.backgroundImage = `url('/towers/imgs/towers.png')`;
                towerImg.style.width = TOWER_IMG_PRE_WIDTH + "px";
                towerImg.style.height = TOWER_IMG_PRE_HEIGHT + "px";
                let diffPos = towerObj.getImgStartPosByIndex(towerObj.imgIndex);
                towerImg.style.backgroundPositionX = -diffPos.x + "px";
                towerImg.style.backgroundPositionY = -diffPos.y + "px";
                towerImg.style.margin = "0 auto";
                towerEle.appendChild(towerImg);
                // Data section
                let data = document.createElement("div");
                let line = document.createElement("p");
                line.innerText = `射程：${towerObj.rangeR}px`;
                data.appendChild(line);
                line = document.createElement("p");
                line.innerText = `子弹速度：${towerObj.bullySpeed}`;
                data.appendChild(line);

                line = document.createElement("p");
                line.innerText = `血量：${towerObj.rangeR}`;
                data.appendChild(line);

                line = document.createElement("p");
                line.innerText = `攻击间歇时间：${towerObj.clock}`;
                data.appendChild(line);
                line = document.createElement("p");
                line.innerText = `价格：${towerObj.price}`;
                data.appendChild(line);

                line = document.createElement("p");
                line.innerText = `详细信息：${towerObj.comment}`;
                data.appendChild(line);

                towerEle.appendChild(data);
                // Overview
                let common = document.createElement("div");
                towerEle.appendChild(common);

                contentEle.appendChild(towerEle);
            }
        } catch (e) {
            console.error('Error initializing cannon interface:', e);
            contentEle.innerHTML = '<p style="color: red;">Failed to load tower data: ' + e + '</p>';
        }
    }
}
