import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { getHealthMock } from '@/api/mocks/index.msw';

// jsdom does not implement scrolling; pages call it during navigation and focus changes.
window.scrollTo = () => {};

const mockServer = setupServer(...getHealthMock());

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());
