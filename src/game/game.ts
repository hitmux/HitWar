/**
 * Game class - Game loop controller
 * by littlefean
 */

import { World } from './world';

export class Game {
    gameSpeed: number;
    gameWorld: World;
    gameCanvasEle: HTMLCanvasElement | null;
    isEnd: boolean;
    isPaused: boolean;

    constructor(world: World) {
        this.gameSpeed = 25;  // Milliseconds per tick, larger = slower, must be > 0
        this.gameWorld = world;
        this.gameCanvasEle = null;
        this.isEnd = false;
        this.isPaused = false;
    }

    /**
     * Start game loop
     */
    start(): void {
        let lastTime = 0;
        const gameLoop = (currentTime: number): void => {
            if (this.isGameFalse()) {
                this.gameEndFunc();
                return;
            }

            // Control game speed: only update when enough time has passed
            if (currentTime - lastTime >= this.gameSpeed) {
                if (!this.isPaused) {
                    this.gameWorld.goTick();
                    this.gameWorld.render(this.gameCanvasEle || undefined);
                }
                lastTime = currentTime;
            }

            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    /**
     * Game over callback
     */
    gameEndFunc(): void {
        alert("you fail!");
        location.reload();
    }

    /**
     * Check if game is lost
     */
    isGameFalse(): boolean {
        return (this.gameWorld.rootBuilding as any).isDead() || this.isEnd;
    }
}
