import { spawn } from 'node:child_process';
const children = [];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(p => p.kill()); setTimeout(() => process.exit(code), 300).unref(); }
const args = process.argv.slice(2);
for (const command of [['backend/server.mjs'], ['node_modules/vite/bin/vite.js', 'dev', '--host', '127.0.0.1', '--port', '5173', '--strictPort', ...args]]) {
  const child = spawn(process.execPath, command, { stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', e => { console.error(e.message); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
