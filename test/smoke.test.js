import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proj = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('project smoke: critical files exist', () => {
  for (const rel of ['index.html', 'package.json', 'capacitor.config.ts', 'android']) {
    assert.ok(fs.existsSync(path.join(proj, rel)), `missing ${rel}`);
  }
});

test('package.json has name', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(proj, 'package.json'), 'utf8'));
  assert.ok(pkg.name);
});
