/**
 * Worker rendering capability detection
 * Verifies browser support for Worker + OffscreenCanvas + ImageBitmap pipeline
 */

// Cached result — detect once, reuse thereafter
let _cachedResult: boolean | null = null;

/**
 * Detect whether the Worker rendering pipeline is supported.
 *
 * 5-step verification:
 * 1. Worker constructor available
 * 2. OffscreenCanvas constructor available
 * 3. OffscreenCanvas supports getContext('2d')
 * 4. transferToImageBitmap method exists
 * 5. Actually create and transfer an ImageBitmap
 *
 * Main thread and Worker share the same browser engine, so passing here
 * implies Worker-side OffscreenCanvas support as well.
 */
export function detectWorkerRenderingSupport(): boolean {
    if (_cachedResult !== null) return _cachedResult;

    try {
        // Step 1: Worker support
        if (typeof Worker === 'undefined') {
            return (_cachedResult = false);
        }

        // Step 2: OffscreenCanvas support
        if (typeof OffscreenCanvas === 'undefined') {
            return (_cachedResult = false);
        }

        // Step 3: 2D context on OffscreenCanvas
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return (_cachedResult = false);
        }

        // Step 4: transferToImageBitmap method available
        if (typeof canvas.transferToImageBitmap !== 'function') {
            return (_cachedResult = false);
        }

        // Step 5: Actually create and transfer an ImageBitmap
        const bitmap = canvas.transferToImageBitmap();
        if (!(bitmap instanceof ImageBitmap)) {
            return (_cachedResult = false);
        }
        bitmap.close();

        return (_cachedResult = true);
    } catch {
        return (_cachedResult = false);
    }
}

/** Reset cached result (for testing only) */
export function resetCapabilityCache(): void {
    _cachedResult = null;
}
