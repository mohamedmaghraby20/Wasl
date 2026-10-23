import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { getHealthMock } from '@/api/mocks/index.msw';

// jsdom does not implement scrolling; pages call it during navigation and focus changes.
window.scrollTo = () => {};

// jsdom does not implement pointer capture or scrollIntoView, which Radix
// primitives (select, popover, dropdown) call while opening and moving focus.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};

// jsdom does not implement ResizeObserver, which Radix uses to size poppers.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
}

const mockServer = setupServer(...getHealthMock());

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());
