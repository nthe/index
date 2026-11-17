import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scripts = [];
const document = {
  documentElement: { dataset: {} },
  currentScript: { src: 'https://example.com/assets/theme.js' },
  head: { append: script => scripts.push(script) },
  createElement: tag => {
    assert.equal(tag, 'script');
    return { dataset: {} };
  },
  addEventListener: () => {},
};
vm.runInNewContext(readFileSync(new URL('../assets/theme.js', import.meta.url), 'utf8'), {
  document,
  localStorage: { getItem: () => null },
  URL,
});
assert.equal(scripts.length, 1);
assert.equal(scripts[0].src, 'https://umami.ttdev.xyz/script.js');
assert.equal(scripts[0].dataset.websiteId, 'db465713-3cda-47fb-aff7-ca21d3ea764f');
assert.equal(scripts[0].async, true);
console.log('Analytics script verified.');
