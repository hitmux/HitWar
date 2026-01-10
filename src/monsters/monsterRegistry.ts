/**
 * MonsterRegistry - Central registry for all monster types
 *
 * This registry provides a unified interface for monster creation and class lookup,
 * maintaining backward compatibility with the save system while supporting ES modules.
 */

type MonsterCreator<T = unknown> = (...args: unknown[]) => T;
type ClassGetter<T = unknown> = () => T;

export class MonsterRegistry {
    static _creators: Map<string, MonsterCreator> = new Map();
    static _classTypes: Map<string, ClassGetter> = new Map();

    /**
     * Register a monster creator function
     */
    static register(name: string, creator: MonsterCreator): void {
        this._creators.set(name, creator);
    }

    /**
     * Register a monster class type (for special monster classes like MonsterShooter)
     */
    static registerClassType(name: string, classGetter: ClassGetter): void {
        this._classTypes.set(name, classGetter);
    }

    /**
     * Get a monster creator by name
     */
    static getCreator(name: string): MonsterCreator | undefined {
        return this._creators.get(name);
    }

    /**
     * Get a monster class type by name
     */
    static getClassType(name: string): unknown | null {
        const getter = this._classTypes.get(name);
        return getter ? getter() : null;
    }

    /**
     * Create a monster instance by name
     */
    static create(name: string, ...args: unknown[]): unknown | null {
        const creator = this._creators.get(name);
        return creator ? creator(...args) : null;
    }

    /**
     * Check if a monster type is registered
     */
    static has(name: string): boolean {
        return this._creators.has(name);
    }

    /**
     * Get all registered monster names
     */
    static getNames(): string[] {
        return Array.from(this._creators.keys());
    }

    /**
     * Get MonsterCreators as object (for save system compatibility)
     */
    static get MonsterCreators(): Record<string, MonsterCreator> {
        return Object.fromEntries(this._creators);
    }

    /**
     * Get MonsterClassTypes as object (for save system compatibility)
     */
    static get MonsterClassTypes(): Record<string, ClassGetter> {
        return Object.fromEntries(this._classTypes);
    }
}
