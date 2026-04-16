import '@testing-library/jest-dom'
import { server } from './mocks/server'
import { afterAll, afterEach, beforeAll } from 'vitest'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers between tests to avoid state bleed
afterEach(() => server.resetHandlers())

// Shut down server after all tests complete
afterAll(() => server.close())
