import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// MSW server instance used in Vitest (Node environment)
export const server = setupServer(...handlers)
