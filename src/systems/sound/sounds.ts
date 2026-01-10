/**
 * Sounds - BGM and sound effects management
 *
 * by littlefean
 */

import { SoundManager } from './soundManager';

// BGM element references (initialized lazily)
let SOUND_BGM: HTMLAudioElement | null = null;
let SOUND_WAR_BGM: HTMLAudioElement | null = null;

/**
 * Initialize BGM elements (call after DOM ready)
 */
export function initBGM(): void {
    SOUND_BGM = document.getElementById("bgm") as HTMLAudioElement | null;
    SOUND_WAR_BGM = document.getElementById("warBgm") as HTMLAudioElement | null;

    if (SOUND_WAR_BGM) {
        SOUND_WAR_BGM.addEventListener("ended", function () {
            SOUND_WAR_BGM?.play();
        });
    }
}

export class Sounds {
    /**
     * Switch background music
     */
    static switchBgm(bgm: "main" | "war"): void {
        switch (bgm) {
            case "main":
                if (SOUND_WAR_BGM) SOUND_WAR_BGM.pause();
                if (SOUND_BGM) SOUND_BGM.play();
                break;
            case "war":
                if (SOUND_BGM) SOUND_BGM.pause();
                if (SOUND_WAR_BGM) SOUND_WAR_BGM.play();
                break;
        }
    }

    static playNewMonsterFlow(): void {
        SoundManager.play("/sound/号角.mp3");
    }

    static playArtilleryLunch(): void {
        // TODO: Add artillery launch sound
    }

    static ArtilleryBomb(): void {
        // TODO: Add artillery bomb sound
    }

    static MissileLunch(): void {
        // TODO: Add missile launch sound
    }

    static MissileBomb(): void {
        // TODO: Add missile bomb sound
    }
}
