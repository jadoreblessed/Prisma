// The klend SDK imports Orca's Node binding, even when no whirlpool is used.
// Vercel bundles the JS into a function and moves it away from its adjacent wasm.
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve('node_modules/@orca-so/whirlpools-core/dist/nodejs/orca_whirlpools_core_js_bindings.js');
if (!fs.existsSync(source)) throw new Error('Orca binding missing; check the installed klend SDK');
const before = "const path = require('path').join(__dirname, 'orca_whirlpools_core_js_bindings_bg.wasm');";
const after = "const path = require('path').join(process.cwd(), 'node_modules/@orca-so/whirlpools-core/dist/nodejs/orca_whirlpools_core_js_bindings_bg.wasm');";
const input = fs.readFileSync(source, 'utf8');
if (input.includes(after)) process.exit(0);
if (!input.includes(before)) throw new Error('Orca binding changed; review the wasm patch');
fs.writeFileSync(source, input.replace(before, after));
