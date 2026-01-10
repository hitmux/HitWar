/**
 * Monsters wiki interface
 */

import { gotoPage } from '../navigation/router';
import { getMonsterFuncArr, MONSTER_IMG_PRE_WIDTH, MONSTER_IMG_PRE_HEIGHT } from '../../monsters/index';

// Helper: ensure assets respect Vite base path
const assetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL ?? "/";
    return `${base}${path.replace(/^\//, "")}`;
};

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

// Flag to prevent multiple event bindings
let isInitialized = false;

/**
 * Monsters interface logic
 */
export function monstersInterface(): void {
    let thisInterface = document.querySelector(".monsters-interface") as HTMLElement;

    // Only add event listener once
    if (!isInitialized) {
        thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
            gotoPage("wiki-interface");
        });
        isInitialized = true;
    }

    let contentEle = thisInterface.querySelector(".content") as HTMLElement;

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
            for (let monster of MONSTERS_FUNC_ARR_ALL) {
                try {
                    let monsterObj = (monster as (world: unknown) => MonsterLike)(mockWorld);
                    let monsterEle = document.createElement("div");
                    monsterEle.classList.add("monster");

                    let title = document.createElement("h3");
                    title.innerText = monsterObj.name;
                    monsterEle.appendChild(title);
                    // Image
                    let imgDiv = document.createElement("div");
                    imgDiv.style.backgroundImage = `url('${assetUrl("/monster/imgs/monsters.png")}')`;
                    imgDiv.style.width = MONSTER_IMG_PRE_WIDTH + "px";
                    imgDiv.style.height = MONSTER_IMG_PRE_HEIGHT + "px";
                    let diffPos = monsterObj.getImgStartPosByIndex(monsterObj.imgIndex);
                    imgDiv.style.backgroundPositionX = -diffPos.x + "px";
                    imgDiv.style.backgroundPositionY = -diffPos.y + "px";
                    imgDiv.style.margin = "0 auto";
                    monsterEle.appendChild(imgDiv);
                    // Data section
                    let data = document.createElement("div");

                    let line = document.createElement("p");
                    line.innerText = `血量：${monsterObj.maxHp}`;
                    data.appendChild(line);

                    line = document.createElement("p");
                    line.innerText = `奖金：${monsterObj.addPrice}`;
                    data.appendChild(line);

                    line = document.createElement("p");
                    line.innerText = `碰撞伤害：${monsterObj.colishDamage}`;
                    data.appendChild(line);

                    line = document.createElement("p");
                    line.innerText = `速度：${monsterObj.speedNumb}`;
                    data.appendChild(line);

                    line = document.createElement("p");
                    line.innerText = `加速度：${monsterObj.accelerationV}`;
                    data.appendChild(line);

                    line = document.createElement("p");
                    line.innerText = `介绍：${monsterObj.comment}`;
                    data.appendChild(line);
                    monsterEle.appendChild(data);

                    contentEle.appendChild(monsterEle);
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
