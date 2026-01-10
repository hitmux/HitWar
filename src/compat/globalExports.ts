/**
 * Global Exports for Backward Compatibility
 *
 * This module exports necessary classes and objects to the global scope
 * to maintain compatibility with the save system and other legacy code.
 */

import { TowerRegistry } from '../towers/towerRegistry';
import { MonsterRegistry } from '../monsters/monsterRegistry';
import { BuildingRegistry } from '../buildings/buildingRegistry';
import { BulletRegistry, BullyFinallyCompat } from '../bullets/index';

// Import base classes for global export
import { Tower, TowerLaser, TowerHell, TowerHammer, TowerBoomerang, TowerRay } from '../towers/base/index';
import { Monster, MonsterShooter, MonsterMortis, MonsterTerminator } from '../monsters/base/index';
import { Building } from '../buildings/building';
import { Bully } from '../bullets/bullet';

// Import core classes
import { Vector } from '../core/math/vector';
import { Circle } from '../core/math/circle';
import { Line } from '../core/math/line';
import { Rectangle } from '../core/math/rectangle';
import { MyColor } from '../entities/myColor';
import { CircleObject } from '../entities/base/circleObject';
import { LineObject } from '../entities/base/lineObject';

// Import image assets
import { UP_LEVEL_ICON, TOWER_IMG, MONSTER_IMG } from '../ui/assets/imageLoader';

// Import tower constants
import { TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT, initTowersImg } from '../towers/towerConstants';

// Import monster constants setter
import { setMonstersImg, getMonstersImg } from '../monsters/monsterConstants';

// Import sound manager
import { SoundManager } from '../systems/sound/soundManager';

// Import game functions
import { Functions } from '../core/functions';

// Import effects
import { Effect, EffectText } from '../effects/effect';
import { EffectLine } from '../effects/effectLine';
import { EffectCircle } from '../effects/effectCircle';

// Extend Window interface for global exports
declare global {
    interface Window {
        TowerCreators: typeof TowerRegistry.TowerCreators;
        TowerClassTypes: typeof TowerRegistry.TowerClassTypes;
        MonsterCreators: typeof MonsterRegistry.MonsterCreators;
        MonsterClassTypes: typeof MonsterRegistry.MonsterClassTypes;
        BuildingCreators: typeof BuildingRegistry.BuildingCreators;
        BullyCreators: typeof BulletRegistry.BullyCreators;

        Tower: typeof Tower;
        TowerLaser: typeof TowerLaser;
        TowerHell: typeof TowerHell;
        TowerHammer: typeof TowerHammer;
        TowerBoomerang: typeof TowerBoomerang;
        TowerRay: typeof TowerRay;

        Monster: typeof Monster;
        MonsterShooter: typeof MonsterShooter;
        MonsterMortis: typeof MonsterMortis;
        MonsterTerminator: typeof MonsterTerminator;

        Building: typeof Building;
        Bully: typeof Bully;

        Vector: typeof Vector;
        Circle: typeof Circle;
        Line: typeof Line;
        Rectangle: typeof Rectangle;
        MyColor: typeof MyColor;
        CircleObject: typeof CircleObject;
        LineObject: typeof LineObject;

        TowerRegistry: typeof TowerRegistry;
        MonsterRegistry: typeof MonsterRegistry;
        BuildingRegistry: typeof BuildingRegistry;
        BulletRegistry: typeof BulletRegistry;

        BullyFinally: typeof BullyFinallyCompat;

        TOWERS_IMG: HTMLImageElement;
        MONSTER_IMG: HTMLImageElement;
        UP_LEVEL_ICON: HTMLImageElement;
        TOWER_IMG_PRE_WIDTH: number;
        TOWER_IMG_PRE_HEIGHT: number;

        SoundManager: typeof SoundManager;
        Functions: typeof Functions;

        Effect: typeof Effect;
        EffectText: typeof EffectText;
        EffectLine: typeof EffectLine;
        EffectCircle: typeof EffectCircle;

        __HitWar_VERSION__?: string;
    }
}

/**
 * Initialize global exports for backward compatibility
 * Call this function during app initialization
 */
export function initGlobalExports(): void {
    // Export registry compatibility objects
    window.TowerCreators = TowerRegistry.TowerCreators;
    window.TowerClassTypes = TowerRegistry.TowerClassTypes;
    window.MonsterCreators = MonsterRegistry.MonsterCreators;
    window.MonsterClassTypes = MonsterRegistry.MonsterClassTypes;
    window.BuildingCreators = BuildingRegistry.BuildingCreators;
    window.BullyCreators = BulletRegistry.BullyCreators;

    // Export base classes (needed for save system instanceof checks)
    window.Tower = Tower;
    window.TowerLaser = TowerLaser;
    window.TowerHell = TowerHell;
    window.TowerHammer = TowerHammer;
    window.TowerBoomerang = TowerBoomerang;
    window.TowerRay = TowerRay;

    window.Monster = Monster;
    window.MonsterShooter = MonsterShooter;
    window.MonsterMortis = MonsterMortis;
    window.MonsterTerminator = MonsterTerminator;

    window.Building = Building;
    window.Bully = Bully;

    // Export core classes
    window.Vector = Vector;
    window.Circle = Circle;
    window.Line = Line;
    window.Rectangle = Rectangle;
    window.MyColor = MyColor;
    window.CircleObject = CircleObject;
    window.LineObject = LineObject;

    // Export registries themselves
    window.TowerRegistry = TowerRegistry;
    window.MonsterRegistry = MonsterRegistry;
    window.BuildingRegistry = BuildingRegistry;
    window.BulletRegistry = BulletRegistry;

    // Export BullyFinally for bullet creation (used by towers and monsters)
    window.BullyFinally = BullyFinallyCompat;

    // Export image assets (used by render methods)
    window.TOWERS_IMG = TOWER_IMG;
    window.MONSTER_IMG = MONSTER_IMG;
    window.UP_LEVEL_ICON = UP_LEVEL_ICON;
    window.TOWER_IMG_PRE_WIDTH = TOWER_IMG_PRE_WIDTH;
    window.TOWER_IMG_PRE_HEIGHT = TOWER_IMG_PRE_HEIGHT;

    // Initialize tower image for getTowersImg() to work
    initTowersImg(TOWER_IMG);

    // Set monsters image for getMonstersImg() to work
    setMonstersImg(MONSTER_IMG);

    // Initialize grid dimensions for image indexing optimization
    Tower.initGrid();
    Monster.initGrid();

    // Export SoundManager for bullet sound effects
    window.SoundManager = SoundManager;

    // Export game functions
    window.Functions = Functions;

    // Export effect classes
    window.Effect = Effect;
    window.EffectText = EffectText;
    window.EffectLine = EffectLine;
    window.EffectCircle = EffectCircle;

    console.log('Global exports initialized for backward compatibility');
}
