/**
 * BuildingRegistry - Central registry for all building types
 *
 * This registry provides a unified interface for building creation and class lookup,
 * maintaining backward compatibility with the save system while supporting ES modules.
 */

type BuildingCreator<T = unknown> = (...args: unknown[]) => T;
type ClassGetter<T = unknown> = () => T;

export class BuildingRegistry {
    static _creators: Map<string, BuildingCreator> = new Map();
    static _classTypes: Map<string, ClassGetter> = new Map();

    /**
     * Register a building creator function
     */
    static register(name: string, creator: BuildingCreator): void {
        this._creators.set(name, creator);
    }

    /**
     * Register a building class type
     */
    static registerClassType(name: string, classGetter: ClassGetter): void {
        this._classTypes.set(name, classGetter);
    }

    /**
     * Get a building creator by name
     */
    static getCreator(name: string): BuildingCreator | undefined {
        return this._creators.get(name);
    }

    /**
     * Get a building class type by name
     */
    static getClassType(name: string): unknown | null {
        const getter = this._classTypes.get(name);
        return getter ? getter() : null;
    }

    /**
     * Create a building instance by name
     */
    static create(name: string, ...args: unknown[]): unknown | null {
        const creator = this._creators.get(name);
        return creator ? creator(...args) : null;
    }

    /**
     * Check if a building type is registered
     */
    static has(name: string): boolean {
        return this._creators.has(name);
    }

    /**
     * Get all registered building names
     */
    static getNames(): string[] {
        return Array.from(this._creators.keys());
    }

    /**
     * Get BuildingCreators as object (for save system compatibility)
     */
    static get BuildingCreators(): Record<string, BuildingCreator> {
        return Object.fromEntries(this._creators);
    }

    /**
     * Get BuildingClassTypes as object (for save system compatibility)
     */
    static get BuildingClassTypes(): Record<string, ClassGetter> {
        return Object.fromEntries(this._classTypes);
    }
}
