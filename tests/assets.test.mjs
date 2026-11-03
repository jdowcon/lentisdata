import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('GitHub Pages -julkaisun kaikki PWA-resurssit ovat olemassa', () => {
  const names = ['./index.html', './styles.css', './manifest.webmanifest', './assets/icon.svg', './src/app.mjs', './src/domain.mjs', './src/storage.mjs', './src/sync.mjs'];
  for (const name of names) assert.ok(existsSync(new URL('../' + name.slice(2), import.meta.url)), name);
  assert.match(index, /src="\.\/src\/app\.mjs"/);
});

test('Offline-shell toimii verkon palautuessa ja päivityksen jälkeen', () => {
  assert.match(sw, /cache\.addAll\(ASSETS\)/);
  assert.match(sw, /await fetch\(request\)/);
  assert.match(sw, /cache\.match\(offlineHome\)/);
  assert.match(sw, /key !== CACHE/);
  assert.ok(!sw.includes('importScripts('));
});
