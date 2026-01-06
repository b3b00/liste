// TypeScript wrapper to publish the compiled worker as `listes-worker`
// It re-exports the default fetch handler and Durable Object class from public/_worker.js

import worker, { ListSync } from './public/_worker.js';

export { ListSync };
export default (worker as any);
