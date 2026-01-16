/**
 * HitWar ES Modules Entry Point
 *
 * This file will be the main entry point after the ES Modules migration.
 */

// Test imports from core module
import {
    Vector,
    Circle,
    Line,
    Rectangle,
    QuadTree,
    Obstacle,
    Camera,
    InputHandler,
    Functions,
    PR,
    standardize,
    drawLine,
    drawRectStroke,
    drawRectFill,
    writeFont
} from './core/index';

// Test imports from entities module
import { MyColor, CircleObject, LineObject } from './entities/index';

// Test imports from towers module (Phase 4)
import {
    TowerRegistry,
    Tower,
    TowerLaser,
    TowerHell,
    TowerHammer,
    TowerBoomerang,
    TowerRay,
    getTowerFuncArr,
    TOWER_IMG_PRE_WIDTH,
    TOWER_IMG_PRE_HEIGHT
} from './towers/index';

// Test imports from monsters module (Phase 5)
import {
    MonsterRegistry,
    Monster,
    MonsterShooter,
    MonsterMortis,
    MonsterTerminator,
    MonsterGroup,
    getMonsterFuncArr,
    MONSTER_IMG_PRE_WIDTH,
    MONSTER_IMG_PRE_HEIGHT
} from './monsters/index';

// Test imports from bullets module (Phase 6)
import {
    BulletRegistry,
    Bully,
    BulletLauncher,
    getBulletFuncArr,
    BullyFinallyCompat
} from './bullets/index';

// Test imports from effects module (Phase 7)
import {
    Effect,
    EffectText,
    EffectCircle,
    EffectLine
} from './effects/index';

// Test imports from buildings module (Phase 7)
import {
    BuildingRegistry,
    Building,
    getBuildingFuncArr,
    BuildingFinallyCompat
} from './buildings/index';

// Test imports from systems module (Phase 8)
import {
    Territory,
    TerritoryRenderer,
    Energy,
    EnergyRenderer,
    Mine,
    SoundManager,
    Sounds,
    initBGM,
    SaveManager,
    SaveUI,
    SAVE_VERSION,
    SAVE_KEY_PREFIX
} from './systems/index';

// Test imports from ui/notes module (Phase 8)
import { NoteManager, NoteUI } from './ui/notes/index';

// Test imports from game module (Phase 9)
import { World } from './game/index';

// Verification
console.log('HitWar ES Modules - Phase 9 Complete');
console.log('');
console.log('Core modules loaded:');
console.log('  - Vector:', typeof Vector);
console.log('  - Circle:', typeof Circle);
console.log('  - Line:', typeof Line);
console.log('  - Rectangle:', typeof Rectangle);
console.log('  - QuadTree:', typeof QuadTree);
console.log('  - Obstacle:', typeof Obstacle);
console.log('  - Camera:', typeof Camera);
console.log('  - InputHandler:', typeof InputHandler);
console.log('  - Functions:', typeof Functions);
console.log('  - PR:', PR);

console.log('');
console.log('Entity modules loaded:');
console.log('  - MyColor:', typeof MyColor);
console.log('  - CircleObject:', typeof CircleObject);
console.log('  - LineObject:', typeof LineObject);

console.log('');
console.log('Tower base classes loaded:');
console.log('  - Tower:', typeof Tower);
console.log('  - TowerLaser:', typeof TowerLaser);
console.log('  - TowerHell:', typeof TowerHell);
console.log('  - TowerHammer:', typeof TowerHammer);
console.log('  - TowerBoomerang:', typeof TowerBoomerang);
console.log('  - TowerRay:', typeof TowerRay);

console.log('');
console.log('Tower constants:');
console.log('  - TOWER_IMG_PRE_WIDTH:', TOWER_IMG_PRE_WIDTH);
console.log('  - TOWER_IMG_PRE_HEIGHT:', TOWER_IMG_PRE_HEIGHT);

console.log('');
console.log('Monster base classes loaded:');
console.log('  - Monster:', typeof Monster);
console.log('  - MonsterShooter:', typeof MonsterShooter);
console.log('  - MonsterMortis:', typeof MonsterMortis);
console.log('  - MonsterTerminator:', typeof MonsterTerminator);
console.log('  - MonsterGroup:', typeof MonsterGroup);

console.log('');
console.log('Monster constants:');
console.log('  - MONSTER_IMG_PRE_WIDTH:', MONSTER_IMG_PRE_WIDTH);
console.log('  - MONSTER_IMG_PRE_HEIGHT:', MONSTER_IMG_PRE_HEIGHT);

console.log('');
console.log('Bullet classes loaded:');
console.log('  - Bully:', typeof Bully);
console.log('  - BulletLauncher:', typeof BulletLauncher);
console.log('  - BullyFinallyCompat:', typeof BullyFinallyCompat);

console.log('');
console.log('Registry modules loaded:');
console.log('  - TowerRegistry:', typeof TowerRegistry);
console.log('  - MonsterRegistry:', typeof MonsterRegistry);
console.log('  - BulletRegistry:', typeof BulletRegistry);
console.log('  - BuildingRegistry:', typeof BuildingRegistry);

// Quick functional test
const v1 = new Vector(1, 2);
const v2 = new Vector(3, 4);
console.log('');
console.log('Vector test: v1 + v2 =', v1.plus(v2).toString());

const color = MyColor.GRAY();
console.log('MyColor test:', color.toStringRGBA());

// Tower registry test
console.log('');
console.log('Tower Registry Tests:');
const registeredTowers = TowerRegistry.getNames();
console.log('  - Registered towers:', registeredTowers.length);
console.log('  - Has BasicCannon:', TowerRegistry.has('BasicCannon') ? 'OK' : 'FAIL');
console.log('  - Has Laser:', TowerRegistry.has('Laser') ? 'OK' : 'FAIL');
console.log('  - Has Thunder_1:', TowerRegistry.has('Thunder_1') ? 'OK' : 'FAIL');
console.log('  - TowerCreators compatibility:', typeof TowerRegistry.TowerCreators === 'object' ? 'OK' : 'FAIL');
console.log('  - TowerClassTypes:', Object.keys(TowerRegistry.TowerClassTypes).length, 'types');

// Test getTowerFuncArr
const towerFuncs = getTowerFuncArr();
console.log('  - getTowerFuncArr():', towerFuncs.length, 'functions');

// Monster registry test
console.log('');
console.log('Monster Registry Tests:');
const registeredMonsters = MonsterRegistry.getNames();
console.log('  - Registered monsters:', registeredMonsters.length);
console.log('  - Has Normal:', MonsterRegistry.has('Normal') ? 'OK' : 'FAIL');
console.log('  - Has Slime_L:', MonsterRegistry.has('Slime_L') ? 'OK' : 'FAIL');
console.log('  - Has T800:', MonsterRegistry.has('T800') ? 'OK' : 'FAIL');
console.log('  - MonsterCreators compatibility:', typeof MonsterRegistry.MonsterCreators === 'object' ? 'OK' : 'FAIL');
console.log('  - MonsterClassTypes:', Object.keys(MonsterRegistry.MonsterClassTypes).length, 'types');

// Test getMonsterFuncArr
const monsterFuncs = getMonsterFuncArr();
console.log('  - getMonsterFuncArr():', monsterFuncs.length, 'functions');

// Bullet registry test (Phase 6)
console.log('');
console.log('Bullet Registry Tests:');
const registeredBullets = BulletRegistry.getNames();
console.log('  - Registered bullets:', registeredBullets.length);
console.log('  - Has Normal:', BulletRegistry.has('Normal') ? 'OK' : 'FAIL');
console.log('  - Has H_S:', BulletRegistry.has('H_S') ? 'OK' : 'FAIL');
console.log('  - Has ThunderBall:', BulletRegistry.has('ThunderBall') ? 'OK' : 'FAIL');
console.log('  - Has SS_Third:', BulletRegistry.has('SS_Third') ? 'OK' : 'FAIL');
console.log('  - BullyCreators compatibility:', typeof BulletRegistry.BullyCreators === 'object' ? 'OK' : 'FAIL');
console.log('  - BulletClassTypes:', Object.keys(BulletRegistry.BulletClassTypes).length, 'types');

// Test getBulletFuncArr
const bulletFuncs = getBulletFuncArr();
console.log('  - getBulletFuncArr():', bulletFuncs.length, 'functions');

// Test BullyFinallyCompat
const normalBullet = (BullyFinallyCompat as any).Normal();
console.log('  - BullyFinallyCompat.Normal() works:', normalBullet instanceof Bully ? 'OK' : 'FAIL');

// Sample registered bullets
console.log('');
console.log('Sample registered bullets:');
registeredBullets.slice(0, 10).forEach(name => console.log('  -', name));

// Sample registered monsters
console.log('');
console.log('Sample registered monsters:');
registeredMonsters.slice(0, 10).forEach(name => console.log('  -', name));

// Sample registered towers
console.log('');
console.log('Sample registered towers:');
registeredTowers.slice(0, 10).forEach(name => console.log('  -', name));

// Effect classes test (Phase 7)
console.log('');
console.log('Effect classes loaded:');
console.log('  - Effect:', typeof Effect);
console.log('  - EffectText:', typeof EffectText);
console.log('  - EffectCircle:', typeof EffectCircle);
console.log('  - EffectLine:', typeof EffectLine);

// Test EffectCircle object pool
const testPos = new Vector(100, 100);
const effectCircle = EffectCircle.acquire(testPos);
console.log('  - EffectCircle.acquire() works:', effectCircle instanceof EffectCircle ? 'OK' : 'FAIL');
EffectCircle.release(effectCircle);
console.log('  - EffectCircle._pool length:', EffectCircle._pool.length);

// Building registry test (Phase 7)
console.log('');
console.log('Building Registry Tests:');
const registeredBuildings = BuildingRegistry.getNames();
console.log('  - Registered buildings:', registeredBuildings.length);
console.log('  - Has Root:', BuildingRegistry.has('Root') ? 'OK' : 'FAIL');
console.log('  - Has Collector:', BuildingRegistry.has('Collector') ? 'OK' : 'FAIL');
console.log('  - Has Treatment:', BuildingRegistry.has('Treatment') ? 'OK' : 'FAIL');
console.log('  - BuildingCreators compatibility:', typeof BuildingRegistry.BuildingCreators === 'object' ? 'OK' : 'FAIL');
console.log('  - BuildingClassTypes:', Object.keys(BuildingRegistry.BuildingClassTypes).length, 'types');

// Test getBuildingFuncArr
const buildingFuncs = getBuildingFuncArr();
console.log('  - getBuildingFuncArr():', buildingFuncs.length, 'functions');

// Sample registered buildings
console.log('');
console.log('Registered buildings:');
registeredBuildings.forEach(name => console.log('  -', name));

// Phase 8: Systems Tests
console.log('');
console.log('=== Phase 8: Systems ===');

// Territory system test
console.log('');
console.log('Territory System:');
console.log('  - Territory:', typeof Territory);
console.log('  - TerritoryRenderer:', typeof TerritoryRenderer);

// Energy system test
console.log('');
console.log('Energy System:');
console.log('  - Energy:', typeof Energy);
console.log('  - EnergyRenderer:', typeof EnergyRenderer);
console.log('  - Mine:', typeof Mine);
console.log('  - Mine.STATE_NORMAL:', Mine.STATE_NORMAL);
console.log('  - Mine.STATE_POWER_PLANT:', Mine.STATE_POWER_PLANT);

// Sound system test
console.log('');
console.log('Sound System:');
console.log('  - SoundManager:', typeof SoundManager);
console.log('  - Sounds:', typeof Sounds);
console.log('  - initBGM:', typeof initBGM);

// Save system test
console.log('');
console.log('Save System:');
console.log('  - SaveManager:', typeof SaveManager);
console.log('  - SaveUI:', typeof SaveUI);
console.log('  - SAVE_VERSION:', SAVE_VERSION);
console.log('  - SAVE_KEY_PREFIX:', SAVE_KEY_PREFIX);
console.log('  - SaveManager.getStorageKey("normal", true):', SaveManager.getStorageKey("normal", true));

// Notes system test
console.log('');
console.log('Notes UI System:');
console.log('  - NoteManager:', typeof NoteManager);
console.log('  - NoteUI:', typeof NoteUI);
console.log('  - NoteManager.STORAGE_KEY:', NoteManager.STORAGE_KEY);

// Phase 9: Game Core
console.log('');
console.log('=== Phase 9: Game Core ===');
console.log('');
console.log('Game Module:');
console.log('  - World:', typeof World);
console.log('  - World.FONT_16:', World.FONT_16);

console.log('');
console.log('Phase 9 Complete - All game core modules loaded successfully!');

// Phase 10: UI Module
import {
    GAME_VERSION,
    initAppElements,
    loadAllImages,
    gotoPage,
    PanelDragManager,
    mainInterface,
    helpInterface,
    choiceInterface,
    wikiInterface,
    cannonInterface,
    monstersInterface,
    endlessMode
} from './ui/index';

// Test TowerFinallyCompat
import { TowerFinallyCompat } from './towers/index';

console.log('');
console.log('=== Phase 10: UI Module ===');
console.log('');
console.log('App State:');
console.log('  - GAME_VERSION:', GAME_VERSION);
console.log('  - initAppElements:', typeof initAppElements);

console.log('');
console.log('Assets:');
console.log('  - loadAllImages:', typeof loadAllImages);

console.log('');
console.log('Navigation:');
console.log('  - gotoPage:', typeof gotoPage);

console.log('');
console.log('Panels:');
console.log('  - PanelDragManager:', typeof PanelDragManager);

console.log('');
console.log('Interfaces:');
console.log('  - mainInterface:', typeof mainInterface);
console.log('  - helpInterface:', typeof helpInterface);
console.log('  - choiceInterface:', typeof choiceInterface);
console.log('  - wikiInterface:', typeof wikiInterface);
console.log('  - cannonInterface:', typeof cannonInterface);
console.log('  - monstersInterface:', typeof monstersInterface);
console.log('  - endlessMode:', typeof endlessMode);

console.log('');
console.log('Compatibility:');
console.log('  - TowerFinallyCompat:', typeof TowerFinallyCompat);
console.log('  - TowerFinallyCompat.BasicCannon:', typeof (TowerFinallyCompat as any).BasicCannon);

console.log('');
console.log('Phase 10 Complete - All UI modules loaded successfully!');
