/**
 * Initialization guard utility
 * Prevents multiple initialization of UI interfaces
 */

// Track initialized interfaces
const initializedInterfaces = new Set<string>();

/**
 * Execute a function only once for a given interface ID
 * @param interfaceId Unique identifier for the interface
 * @param initFn Function to execute on first call
 * @returns True if initialization was performed, false if already initialized
 */
export function withInitGuard(interfaceId: string, initFn: () => void): boolean {
    if (initializedInterfaces.has(interfaceId)) {
        return false;
    }
    initFn();
    initializedInterfaces.add(interfaceId);
    return true;
}

/**
 * Check if an interface has been initialized
 * @param interfaceId Unique identifier for the interface
 */
export function isInitialized(interfaceId: string): boolean {
    return initializedInterfaces.has(interfaceId);
}

/**
 * Reset initialization state for an interface
 * Useful for testing or when interface needs to be re-initialized
 * @param interfaceId Unique identifier for the interface
 */
export function resetInitialization(interfaceId: string): void {
    initializedInterfaces.delete(interfaceId);
}

/**
 * Reset all initialization states
 * Useful for testing or full app reset
 */
export function resetAllInitializations(): void {
    initializedInterfaces.clear();
}
