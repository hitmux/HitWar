import { describe, expect, it, vi } from 'vitest';
import { NetworkEventEmitter } from './eventEmitter';

describe('NetworkEventEmitter', () => {
    it('does nothing when emitting or removing unknown events', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        emitter.emit('missing', 1);
        emitter.off('missing', listener);
        emitter.removeAllFor('missing');

        expect(listener).not.toHaveBeenCalled();
    });

    it('emits arguments to registered listeners in order', () => {
        const emitter = new NetworkEventEmitter();
        const first = vi.fn();
        const second = vi.fn();

        emitter.on('ready', first);
        emitter.on('ready', second);
        emitter.emit('ready', 1, 'two');

        expect(first).toHaveBeenCalledWith(1, 'two');
        expect(second).toHaveBeenCalledWith(1, 'two');
        expect(first.mock.invocationCallOrder[0]).toBeLessThan(second.mock.invocationCallOrder[0]);
    });

    it('returns an unsubscribe function from on', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        const unsubscribe = emitter.on('ready', listener);
        unsubscribe();
        emitter.emit('ready');

        expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribe is idempotent for an already removed listener', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        const unsubscribe = emitter.on('ready', listener);
        unsubscribe();
        unsubscribe();
        emitter.emit('ready');

        expect(listener).not.toHaveBeenCalled();
    });

    it('runs once listeners only once', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        emitter.once('ready', listener);
        emitter.emit('ready', 1);
        emitter.emit('ready', 2);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(1);
    });

    it('allows a once listener to be unsubscribed before it fires', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        const unsubscribe = emitter.once('ready', listener);
        unsubscribe();
        emitter.emit('ready');

        expect(listener).not.toHaveBeenCalled();
    });

    it('uses a snapshot of listeners during emit', () => {
        const emitter = new NetworkEventEmitter();
        const added = vi.fn();
        const first = vi.fn(() => {
            emitter.on('ready', added);
        });
        const second = vi.fn();

        emitter.on('ready', first);
        emitter.on('ready', second);
        emitter.emit('ready');
        emitter.emit('ready');

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(2);
        expect(added).toHaveBeenCalledTimes(1);
    });

    it('still calls a listener that was removed earlier in the same emit snapshot', () => {
        const emitter = new NetworkEventEmitter();
        const second = vi.fn();
        const first = vi.fn(() => {
            emitter.off('ready', second);
        });

        emitter.on('ready', first);
        emitter.on('ready', second);
        emitter.emit('ready');
        emitter.emit('ready');

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('continues emitting when a listener throws', () => {
        const emitter = new NetworkEventEmitter();
        const error = new Error('boom');
        const throwing = vi.fn(() => { throw error; });
        const after = vi.fn();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        emitter.on('ready', throwing);
        emitter.on('ready', after);
        emitter.emit('ready');

        expect(after).toHaveBeenCalledOnce();
        expect(consoleError).toHaveBeenCalledWith('[NetworkEvent] Error in handler for "ready":', error);

        consoleError.mockRestore();
    });

    it('removes listeners by event or globally', () => {
        const emitter = new NetworkEventEmitter();
        const a = vi.fn();
        const b = vi.fn();

        emitter.on('a', a);
        emitter.on('b', b);
        emitter.removeAllFor('a');
        emitter.emit('a');
        emitter.emit('b');

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledOnce();

        emitter.removeAll();
        emitter.emit('b');
        expect(b).toHaveBeenCalledOnce();
    });

    it('isolates listeners with the same callback across different events', () => {
        const emitter = new NetworkEventEmitter();
        const listener = vi.fn();

        emitter.on('a', listener);
        emitter.on('b', listener);
        emitter.off('a', listener);
        emitter.emit('a');
        emitter.emit('b');

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
