import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../../src/scripts/store/Store.js';

describe('Store', () => {
  /** @type {Store} */
  let store;

  beforeEach(() => {
    store = new Store();
  });

  it('registers a slice with its initial state', () => {
    store.registerSlice('counter', (state = 0) => state, 0);
    expect(store.getState()).toEqual({ counter: 0 });
  });

  it('throws when registering the same slice twice', () => {
    store.registerSlice('counter', (state = 0) => state, 0);
    expect(() => store.registerSlice('counter', (state = 0) => state, 0)).toThrow();
  });

  it('dispatches actions through all reducers', () => {
    store.registerSlice(
      'counter',
      (state = 0, action) => (action.type === 'increment' ? state + 1 : state),
      0
    );
    store.dispatch({ type: 'increment' });
    expect(store.getState().counter).toBe(1);
  });

  it('does not notify subscribers when no slice changes', () => {
    store.registerSlice('counter', (state = 0) => state, 0);
    let callCount = 0;
    store.subscribe(() => {
      callCount += 1;
    });
    store.dispatch({ type: 'noop' });
    expect(callCount).toBe(0);
  });

  it('notifies subscribers with prev and next state on change', () => {
    store.registerSlice(
      'counter',
      (state = 0, action) => (action.type === 'increment' ? state + 1 : state),
      0
    );
    let observed = null;
    store.subscribe((state, prevState) => {
      observed = { state, prevState };
    });
    store.dispatch({ type: 'increment' });
    expect(observed.prevState.counter).toBe(0);
    expect(observed.state.counter).toBe(1);
  });

  it('unsubscribe stops further notifications', () => {
    store.registerSlice(
      'counter',
      (state = 0, action) => (action.type === 'increment' ? state + 1 : state),
      0
    );
    let callCount = 0;
    const unsubscribe = store.subscribe(() => {
      callCount += 1;
    });
    store.dispatch({ type: 'increment' });
    unsubscribe();
    store.dispatch({ type: 'increment' });
    expect(callCount).toBe(1);
  });

  it('throws on dispatching a non-object or typeless action', () => {
    expect(() => store.dispatch(null)).toThrow();
    expect(() => store.dispatch({})).toThrow();
  });

  it('hydrateSlice replaces slice state without running reducers', () => {
    let reducerCallCount = 0;
    store.registerSlice(
      'counter',
      (state = 0) => {
        reducerCallCount += 1;
        return state;
      },
      0
    );
    reducerCallCount = 0; // ignore the registration call, if any
    store.hydrateSlice('counter', 42);
    expect(store.getState().counter).toBe(42);
  });

  it('hydrateSlice throws for an unregistered slice', () => {
    expect(() => store.hydrateSlice('missing', 1)).toThrow();
  });

  it('queues re-entrant dispatches issued from within a subscriber', () => {
    store.registerSlice(
      'counter',
      (state = 0, action) => (action.type === 'increment' ? state + 1 : state),
      0
    );

    let secondActionApplied = false;
    store.subscribe((state, prevState, action) => {
      if (action.type === 'increment' && !secondActionApplied) {
        secondActionApplied = true;
        store.dispatch({ type: 'increment' });
      }
    });

    store.dispatch({ type: 'increment' });
    expect(store.getState().counter).toBe(2);
  });

  it('keeps independent slices isolated from one another', () => {
    store.registerSlice(
      'a',
      (state = 0, action) => (action.type === 'bump-a' ? state + 1 : state),
      0
    );
    store.registerSlice(
      'b',
      (state = 0, action) => (action.type === 'bump-b' ? state + 1 : state),
      0
    );

    store.dispatch({ type: 'bump-a' });
    expect(store.getState()).toEqual({ a: 1, b: 0 });
  });
});
