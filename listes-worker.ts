// TypeScript wrapper to publish the compiled worker as `listes-worker`
// Re-export the default fetch handler and the Durable Object class.

import worker from './public/_worker.ts';
import { ListSync } from './public/ListSync.ts';

console.log('[WRAPPER] listes-worker loaded. ListSync exported:', typeof ListSync !== 'undefined');

export { ListSync };
export default (worker as any);
