/**
 * BulletRegistry - Central registry for bullet types
 *
 * Provides a centralized way to register and create bullet instances.
 * Replaces the global BullyFinally class static methods with a registry pattern.
 */

type BulletCreator<T = unknown> = () => T;
type ClassGetter<T = unknown> = () => T;

const bulletCreators: Map<string, BulletCreator> = new Map();
const bulletClassTypes: Map<string, ClassGetter> = new Map();

export const BulletRegistry = {
    /**
     * Register a bullet creator function
     */
    register(name: string, creator: BulletCreator): void {
        if (bulletCreators.has(name)) {
            console.warn(`BulletRegistry: Overwriting existing bullet type "${name}"`);
        }
        bulletCreators.set(name, creator);
    },

    /**
     * Create a bullet instance by name
     */
    create(name: string): unknown | null {
        const creator = bulletCreators.get(name);
        if (!creator) {
            console.warn(`BulletRegistry: Unknown bullet type "${name}"`);
            return null;
        }
        return creator();
    },

    /**
     * Get a creator function by name
     */
    getCreator(name: string): BulletCreator | null {
        return bulletCreators.get(name) || null;
    },

    /**
     * Check if a bullet type is registered
     */
    has(name: string): boolean {
        return bulletCreators.has(name);
    },

    /**
     * Get all registered bullet names
     */
    getNames(): string[] {
        return Array.from(bulletCreators.keys());
    },

    /**
     * Get all registered bullet creators
     */
    getAll(): Map<string, BulletCreator> {
        return new Map(bulletCreators);
    },

    /**
     * Register a bullet class type (for special bullet classes)
     */
    registerClassType(name: string, classGetter: ClassGetter): void {
        bulletClassTypes.set(name, classGetter);
    },

    /**
     * Get a bullet class by name
     */
    getClassType(name: string): unknown | null {
        const getter = bulletClassTypes.get(name);
        return getter ? getter() : null;
    },

    /**
     * Backward compatibility: BullyCreators object
     * Acts like the original BullyFinally class
     */
    get BullyCreators(): Record<string, BulletCreator> {
        const obj: Record<string, BulletCreator> = {};
        for (const [name, creator] of bulletCreators) {
            obj[name] = creator;
        }
        return obj;
    },

    /**
     * Backward compatibility: BulletClassTypes object
     */
    get BulletClassTypes(): Record<string, unknown> {
        const obj: Record<string, unknown> = {};
        for (const [name, getter] of bulletClassTypes) {
            obj[name] = getter();
        }
        return obj;
    }
};
