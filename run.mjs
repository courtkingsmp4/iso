// Node runner:  node tests/run.mjs   (or: npm test)
import { runAll } from './harness.js';
import './all.js';

const { passed, failed, results } = await runAll((r) => {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.error}`}`);
});
console.log(`\n${passed} passed, ${failed} failed, ${results.length} total`);
process.exit(failed ? 1 : 0);
