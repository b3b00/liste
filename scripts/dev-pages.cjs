#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const root = process.cwd();
const origPath = path.join(root, 'wrangler.toml');
const backupPath = path.join(root, 'wrangler.toml.bak');
const devPath = path.join(root, 'wrangler.dev.toml');

if (!fs.existsSync(devPath)) {
  console.error('wrangler.dev.toml not found in project root.');
  process.exit(1);
}

const hadOrig = fs.existsSync(origPath);
try {
  if (hadOrig) fs.copyFileSync(origPath, backupPath);
  fs.copyFileSync(devPath, origPath);
  console.log('Using wrangler.dev.toml as wrangler.toml for pages dev');
} catch (e) {
  console.error('Error preparing wrangler.toml:', e);
  process.exit(1);
}

const child = cp.spawn('npx', ['wrangler', 'pages', 'dev', './public/', '--persist-to=./.wrangler/state/d1', '--d1=D1_lists', '--port=8888'], {
  stdio: 'inherit',
  shell: true,
});

function restoreAndExit(code) {
  try {
    if (hadOrig) {
      fs.copyFileSync(backupPath, origPath);
      fs.unlinkSync(backupPath);
    } else {
      fs.unlinkSync(origPath);
    }
  } catch (e) {
    console.warn('Warning: failed to restore wrangler.toml:', e);
  }
  process.exit(code);
}

process.on('SIGINT', () => {
  child.kill('SIGINT');
  restoreAndExit(0);
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  restoreAndExit(0);
});
child.on('exit', (code) => {
  restoreAndExit(code || 0);
});
