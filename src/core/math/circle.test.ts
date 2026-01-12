/**
 * Simple unit tests for Circle sweep collision detection
 * Run with: npx ts-node src/core/math/circle.test.ts
 * Or import and run the exported test function
 */

import { Circle } from './circle';

interface TestCase {
    name: string;
    fn: () => boolean;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => boolean): void {
    tests.push({ name, fn });
}

function assertEqual(actual: boolean, expected: boolean, message: string): boolean {
    if (actual !== expected) {
        console.error(`  FAILED: ${message}`);
        console.error(`    Expected: ${expected}, Got: ${actual}`);
        return false;
    }
    return true;
}

// Test: sweepCollides - basic endpoint collision
test('sweepCollides: detects collision at start point', () => {
    // Moving circle starts inside the target
    const result = Circle.sweepCollides(
        50, 50,   // start (inside target at 50,50 with r=30)
        100, 50,  // end
        10,       // moving radius
        50, 50,   // target center
        30        // target radius
    );
    return assertEqual(result, true, 'Should detect collision at start point');
});

test('sweepCollides: detects collision at end point', () => {
    // Moving circle ends inside the target
    const result = Circle.sweepCollides(
        0, 0,     // start
        50, 50,   // end (inside target)
        10,       // moving radius
        50, 50,   // target center
        30        // target radius
    );
    return assertEqual(result, true, 'Should detect collision at end point');
});

test('sweepCollides: detects collision during movement', () => {
    // Moving circle passes through target
    const result = Circle.sweepCollides(
        0, 0,     // start
        100, 0,   // end
        5,        // moving radius
        50, 10,   // target center (10 units above path)
        10        // target radius (combined radius = 15, so path intersects)
    );
    return assertEqual(result, true, 'Should detect collision during movement');
});

test('sweepCollides: no collision when path misses', () => {
    // Moving circle completely misses target
    const result = Circle.sweepCollides(
        0, 0,     // start
        100, 0,   // end
        5,        // moving radius
        50, 50,   // target center (50 units away from path)
        10        // target radius (combined = 15, path at y=0 is too far)
    );
    return assertEqual(result, false, 'Should not detect collision when path misses');
});

test('sweepCollides: handles stationary case', () => {
    // Moving circle doesn't move (start == end)
    const result = Circle.sweepCollides(
        50, 50,   // start
        50, 50,   // end (same as start)
        10,       // moving radius
        50, 50,   // target center (same position)
        10        // target radius
    );
    return assertEqual(result, true, 'Should detect collision when stationary at target');
});

test('sweepCollides: handles tangent case', () => {
    // Path just touches the combined radius
    // Path from (0,0) to (100,0), target at (50,15) with r=10
    // Moving circle r=5, combined r=15
    // Distance from path to target = 15, exactly touching
    const result = Circle.sweepCollides(
        0, 0,
        100, 0,
        5,
        50, 15,
        10
    );
    return assertEqual(result, true, 'Should detect collision at tangent');
});

// Test: sweepCollidesRelative - two moving circles
test('sweepCollidesRelative: detects collision when both moving towards each other', () => {
    // A moves from (0,0) to (40,0)
    // B moves from (100,0) to (60,0)
    // They should collide somewhere in the middle
    const result = Circle.sweepCollidesRelative(
        0, 0, 40, 0, 10,    // A: from (0,0) to (40,0), r=10
        100, 0, 60, 0, 10   // B: from (100,0) to (60,0), r=10
    );
    return assertEqual(result, true, 'Should detect collision when moving towards each other');
});

test('sweepCollidesRelative: detects collision when one chases another', () => {
    // A moves from (0,0) to (80,0) - fast
    // B moves from (50,0) to (60,0) - slow
    // A should catch up and collide
    const result = Circle.sweepCollidesRelative(
        0, 0, 80, 0, 10,    // A: fast mover
        50, 0, 60, 0, 10    // B: slow mover
    );
    return assertEqual(result, true, 'Should detect collision when chasing');
});

test('sweepCollidesRelative: no collision when moving in parallel', () => {
    // Both moving in same direction at same speed, far apart
    const result = Circle.sweepCollidesRelative(
        0, 0, 100, 0, 10,   // A: at y=0
        0, 50, 100, 50, 10  // B: at y=50, same velocity
    );
    return assertEqual(result, false, 'Should not collide when parallel and far apart');
});

test('sweepCollidesRelative: detects collision when both stationary and overlapping', () => {
    // Both circles don't move, but overlap
    const result = Circle.sweepCollidesRelative(
        50, 50, 50, 50, 15, // A: stationary at (50,50)
        55, 55, 55, 55, 15  // B: stationary at (55,55), overlapping
    );
    return assertEqual(result, true, 'Should detect overlap when both stationary');
});

test('sweepCollidesRelative: handles high-speed penetration case', () => {
    // Simulate bullet (fast) vs monster (slow)
    // Bullet: from (0,100) to (200,100) - moves 200 units
    // Monster: from (100,100) to (102,100) - moves 2 units
    // They should collide near x=100
    const result = Circle.sweepCollidesRelative(
        0, 100, 200, 100, 5,    // Bullet: r=5, moves fast
        100, 100, 102, 100, 15  // Monster: r=15, moves slow
    );
    return assertEqual(result, true, 'Should detect high-speed bullet hitting slow monster');
});

test('sweepCollidesRelative: bullet passes monster that moved away', () => {
    // Bullet moves through where monster was, but monster moved away
    // Bullet: (0,50) -> (100,50)
    // Monster: (50,50) -> (50,150) - moves away in perpendicular direction
    const result = Circle.sweepCollidesRelative(
        0, 50, 100, 50, 5,     // Bullet moving right
        50, 50, 50, 150, 10    // Monster moving down, out of the way
    );
    // Relative motion: bullet at t=0 is at (0-50, 50-50) = (-50, 0) relative to monster start
    // At t=1, bullet is at (100-50, 50-150) = (50, -100) relative to monster end
    // Relative displacement considers both: check if they intersect
    // This depends on relative velocity, the sweep should detect if they crossed
    // In this case, they start close and move away - should NOT collide
    return assertEqual(result, false, 'Should not collide when monster moves away');
});

// Run all tests
export function runTests(): boolean {
    console.log('Running sweep collision detection tests...\n');
    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        try {
            const result = t.fn();
            if (result) {
                console.log(`✓ ${t.name}`);
                passed++;
            } else {
                failed++;
            }
        } catch (e) {
            console.error(`✗ ${t.name}`);
            console.error(`  Error: ${e}`);
            failed++;
        }
    }

    console.log(`\n${passed}/${passed + failed} tests passed`);
    return failed === 0;
}

// Auto-run if executed directly (in Node.js environment)
declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;
if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('circle.test')) {
    const success = runTests();
    process.exit?.(success ? 0 : 1);
}
