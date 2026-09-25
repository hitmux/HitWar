import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ClientPrediction,
    getClientPrediction,
    GhostTowerProxy,
    resetClientPrediction,
    type PredictedTower,
} from './clientPrediction';

function predictedTower(overrides: Partial<PredictedTower> = {}): PredictedTower {
    return {
        predictionId: 'pred-1',
        towerType: 'BasicCannon',
        x: 10,
        y: 20,
        radius: 15,
        rangeR: 200,
        state: 'pending',
        createdAt: Date.now(),
        alpha: 0.5,
        ...overrides,
    };
}

describe('GhostTowerProxy', () => {
    it('exposes prediction data through renderer-like getters', () => {
        const proxy = new GhostTowerProxy(predictedTower());

        expect(proxy.predictionId).toBe('pred-1');
        expect(proxy.state).toBe('pending');
        expect(proxy.pos.x).toBe(10);
        expect(proxy.pos.y).toBe(20);
        expect(proxy.r).toBe(15);
        expect(proxy.rangeR).toBe(200);
        expect(proxy.hp).toBe(1000);
        expect(proxy.maxHp).toBe(1000);
        expect(proxy.ownerId).toBeNull();
        expect(proxy.inValidTerritory).toBe(true);
        expect(proxy.isDead()).toBe(false);
        expect(proxy.isInScreen()).toBe(true);
        expect(proxy.isUpLevelAble()).toBe(false);
        expect(proxy.getTowerLevel()).toBe(1);
        expect(proxy.getImgStartPosByIndex(99).toString()).toBe('(0,0)');
    });

    it('updates body alpha when rejected', () => {
        const proxy = new GhostTowerProxy(predictedTower());

        expect(proxy.getBodyCircle().fillColor.a).toBe(0.4);
        proxy.updateState('rejected');

        expect(proxy.state).toBe('rejected');
        expect(proxy.isDead()).toBe(true);
        expect(proxy.getBodyCircle().fillColor.a).toBe(0.1);
        expect(proxy.getViewCircle().r).toBe(200);
    });
});

describe('ClientPrediction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-08T00:00:00.000Z'));
        resetClientPrediction();
    });

    afterEach(() => {
        resetClientPrediction();
        vi.useRealTimers();
    });

    it('creates unique build predictions and ghost proxies', () => {
        const prediction = new ClientPrediction();

        const first = prediction.predictBuild('BasicCannon', 10, 20);
        const second = prediction.predictBuild('ManualCannon', 30, 40, 12, 300);

        expect(first).toBe('pred_1780876800000_0');
        expect(second).toBe('pred_1780876800000_1');
        expect(prediction.getPredictionCount()).toBe(2);
        expect(prediction.getGhostTowers()).toHaveLength(2);
        expect(prediction.getGhostTowers()[1].rangeR).toBe(300);
    });

    it('confirms builds immediately and ignores missing ids', () => {
        const prediction = new ClientPrediction();
        const id = prediction.predictBuild('BasicCannon', 10, 20);

        prediction.confirmBuild('missing');
        expect(prediction.getPredictionCount()).toBe(1);
        prediction.confirmBuild(id);

        expect(prediction.getPredictionCount()).toBe(0);
        expect(prediction.getGhostTowers()).toEqual([]);
    });

    it('rejects builds and removes them after the rejection delay', async () => {
        const prediction = new ClientPrediction();
        const id = prediction.predictBuild('BasicCannon', 10, 20);

        prediction.rejectBuild(id);

        expect(prediction.getGhostTowers()[0].state).toBe('rejected');
        expect(prediction.getPredictionCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(500);
        expect(prediction.getPredictionCount()).toBe(0);
    });

    it('tracks sell prediction lifecycle', async () => {
        const prediction = new ClientPrediction();
        const id = prediction.predictSell('tower-1');

        expect(prediction.isTowerPendingSell('tower-1')).toBe(true);
        expect(prediction.isTowerPendingSell('tower-2')).toBe(false);
        prediction.rejectSell(id);
        expect(prediction.isTowerPendingSell('tower-1')).toBe(false);
        await vi.advanceTimersByTimeAsync(500);
        expect(prediction.getPredictionCount()).toBe(0);
    });

    it('confirms sell predictions by id and tower id', () => {
        const prediction = new ClientPrediction();
        const first = prediction.predictSell('tower-1');
        prediction.predictSell('tower-2');

        prediction.confirmSell(first);
        expect(prediction.findAndConfirmSellByTowerId('tower-2')).toBe(true);
        expect(prediction.findAndConfirmSellByTowerId('tower-3')).toBe(false);
        expect(prediction.getPredictionCount()).toBe(0);
    });

    it('finds and confirms the newest matching build prediction', () => {
        const prediction = new ClientPrediction();
        prediction.predictBuild('BasicCannon', 10, 20);
        vi.setSystemTime(new Date('2026-06-08T00:00:01.000Z'));
        const newest = prediction.predictBuild('BasicCannon', 12, 18);

        expect(prediction.findAndConfirmBuild('BasicCannon', 11, 19, 5)).toBe(true);
        expect(prediction.rejectBuildByRequestId(newest)).toBe(false);
        expect(prediction.getPredictionCount()).toBe(1);
    });

    it('rejects pending builds by request id or oldest fallback', () => {
        const prediction = new ClientPrediction();
        const first = prediction.predictBuild('BasicCannon', 10, 20);
        prediction.predictBuild('ManualCannon', 30, 40);

        expect(prediction.rejectBuildByRequestId(first)).toBe(true);
        expect(prediction.rejectBuildByRequestId('missing')).toBe(false);
        expect(prediction.rejectOldestPendingBuild()).toBe(true);
        expect(prediction.rejectOldestPendingBuild()).toBe(false);
    });

    it('rejects pending sells by request id or oldest fallback', () => {
        const prediction = new ClientPrediction();
        const first = prediction.predictSell('tower-1');
        prediction.predictSell('tower-2');

        expect(prediction.rejectSellByRequestId(first)).toBe(true);
        expect(prediction.rejectSellByRequestId('missing')).toBe(false);
        expect(prediction.rejectOldestPendingSell()).toBe(true);
        expect(prediction.rejectOldestPendingSell()).toBe(false);
    });

    it('cleans up stale predictions on update', () => {
        const prediction = new ClientPrediction();
        prediction.predictBuild('BasicCannon', 10, 20);
        prediction.predictSell('tower-1');

        vi.setSystemTime(new Date('2026-06-08T00:00:05.001Z'));
        prediction.update();

        expect(prediction.getPredictionCount()).toBe(0);
        expect(prediction.getGhostTowers()).toEqual([]);
    });

    it('clear removes pending timers and predictions', async () => {
        const prediction = new ClientPrediction();
        const id = prediction.predictBuild('BasicCannon', 10, 20);
        prediction.rejectBuild(id);

        prediction.clear();
        await vi.advanceTimersByTimeAsync(500);

        expect(prediction.getPredictionCount()).toBe(0);
        expect(prediction.getGhostTowers()).toEqual([]);
    });

    it('resets the singleton client prediction manager', () => {
        const first = getClientPrediction();
        first.predictBuild('BasicCannon', 10, 20);

        resetClientPrediction();
        const second = getClientPrediction();

        expect(second).not.toBe(first);
        expect(second.getPredictionCount()).toBe(0);
    });
});
