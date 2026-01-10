/**
 * SoundManager - Unified game sound management
 * Supports immediate mute on pause and audio pooling
 */

export class SoundManager {
    static playingAudios: Set<HTMLAudioElement> = new Set();  // Currently playing audio set
    static isPaused: boolean = false;  // Global pause state
    static audioPool: Map<string, HTMLAudioElement[]> = new Map();  // Audio pool: src -> Audio[]
    static poolSize: number = 5;  // Max pool size per sound

    /**
     * Get or create an audio object from pool
     */
    static getFromPool(src: string): HTMLAudioElement {
        if (!SoundManager.audioPool.has(src)) {
            SoundManager.audioPool.set(src, []);
        }

        const pool = SoundManager.audioPool.get(src)!;

        // Find an idle audio object
        for (const audio of pool) {
            if (audio.paused && audio.currentTime === 0) {
                return audio;
            }
        }

        // Create new if pool not full
        if (pool.length < SoundManager.poolSize) {
            const audio = new Audio(src);
            audio.addEventListener('ended', () => {
                audio.currentTime = 0;
                SoundManager.playingAudios.delete(audio);
            });
            audio.addEventListener('error', () => {
                audio.currentTime = 0;
                SoundManager.playingAudios.delete(audio);
            });
            pool.push(audio);
            return audio;
        }

        // Pool full, reuse oldest (force stop and reuse)
        const audio = pool[0];
        audio.pause();
        audio.currentTime = 0;
        SoundManager.playingAudios.delete(audio);
        return audio;
    }

    /**
     * Play sound effect
     */
    static play(src: string): HTMLAudioElement | null {
        // Block new sounds when paused
        if (SoundManager.isPaused) {
            return null;
        }

        const audio = SoundManager.getFromPool(src);
        SoundManager.playingAudios.add(audio);

        audio.play().catch(() => {
            SoundManager.playingAudios.delete(audio);
        });

        return audio;
    }

    /**
     * Stop all playing sounds
     */
    static stopAll(): void {
        for (const audio of SoundManager.playingAudios) {
            audio.pause();
            audio.currentTime = 0;
        }
        SoundManager.playingAudios.clear();
    }

    /**
     * Pause all playing sounds
     */
    static pauseAll(): void {
        SoundManager.isPaused = true;
        for (const audio of SoundManager.playingAudios) {
            audio.pause();
        }
    }

    /**
     * Resume all paused sounds
     */
    static resumeAll(): void {
        SoundManager.isPaused = false;
        for (const audio of SoundManager.playingAudios) {
            audio.play().catch(() => {});
        }
    }

    /**
     * Clear audio pool (for cleanup)
     */
    static clearPool(): void {
        SoundManager.stopAll();
        SoundManager.audioPool.clear();
    }
}
