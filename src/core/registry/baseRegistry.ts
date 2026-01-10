/**
 * Base Registry - Generic base class for all entity registries
 * Provides unified interface for registering and creating game entities
 */

// Type for a creator function that produces an entity
export type Creator<T> = (...args: unknown[]) => T;

// Type for a class getter function (lazy loading)
export type ClassGetter = () => unknown;

/**
 * Abstract base class for entity registries
 * Subclasses must define their own static _creators and _classTypes maps
 */
export abstract class BaseRegistry<C extends Creator<unknown>> {
    // Subclasses must override these with their own static maps
    protected static _creators: Map<string, Creator<unknown>>;
    protected static _classTypes: Map<string, ClassGetter>;

    /**
     * Register a creator function
     */
    static register(name: string, creator: Creator<unknown>, ...extra: unknown[]): void {
        this._creators.set(name, creator);
    }

    /**
     * Register a class type (for lazy loading)
     */
    static registerClassType(name: string, classGetter: ClassGetter): void {
        this._classTypes.set(name, classGetter);
    }

    /**
     * Get a creator by name
     */
    static getCreator(name: string): Creator<unknown> | undefined {
        return this._creators.get(name);
    }

    /**
     * Get a class type by name
     */
    static getClassType(name: string): unknown | null {
        const getter = this._classTypes.get(name);
        return getter ? getter() : null;
    }

    /**
     * Create an entity instance by name
     */
    static create(name: string, ...args: unknown[]): unknown | null {
        const creator = this._creators.get(name);
        return creator ? creator(...args) : null;
    }

    /**
     * Check if a type is registered
     */
    static has(name: string): boolean {
        return this._creators.has(name);
    }

    /**
     * Get all registered names
     */
    static getNames(): string[] {
        return Array.from(this._creators.keys());
    }

    /**
     * Get creators as plain object (for save system compatibility)
     */
    protected static _getCreatorsObject(): Record<string, Creator<unknown>> {
        return Object.fromEntries(this._creators);
    }

    /**
     * Get class types as plain object
     */
    protected static _getClassTypesObject(): Record<string, ClassGetter> {
        return Object.fromEntries(this._classTypes);
    }
}
