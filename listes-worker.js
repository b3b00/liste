// Wrapper to publish the compiled worker as `listes-worker`
// It re-exports the default fetch handler and Durable Object classes from public/_worker.js
import worker, { ListSync } from './public/_worker.js';

// Re-export the Durable Object class as a named export and the default worker handler
export { ListSync };
export default worker;