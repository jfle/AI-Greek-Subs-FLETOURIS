'use strict';
// Syntax-checks every JavaScript file of the project (and the inline script of the configure page).
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const files = ['server.js', ...['src', 'scripts', 'test'].flatMap((d) =>
  fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.js')).map((f) => path.join(d, f)) : [])];

const html = fs.readFileSync(path.join(root, 'public', 'configure.html'), 'utf8');
const inline = html.match(/<script>([\s\S]*)<\/script>/);
const tmp = path.join(os.tmpdir(), `configure-inline-${process.pid}.js`);
if (inline) fs.writeFileSync(tmp, inline[1]);

let failed = 0;
for (const f of [...files.map((f) => path.join(root, f)), ...(inline ? [tmp] : [])]) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(`✗ ${path.relative(root, f)}\n${e.stderr}`);
  }
}
if (inline) fs.unlinkSync(tmp);
console.log(failed ? `${failed} file(s) with syntax errors` : `✓ ${files.length + (inline ? 1 : 0)} files OK`);
process.exit(failed ? 1 : 0);
