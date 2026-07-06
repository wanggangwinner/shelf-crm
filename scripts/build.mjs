import { cp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

await rm(distDir, { recursive: true, force: true });
await rm(publicDir, { recursive: true, force: true });
await run('tsc', []);
await mkdir(publicDir, { recursive: true });
await cp(path.join(rootDir, 'index.html'), path.join(publicDir, 'index.html'));
await cp(path.join(rootDir, 'src', 'styles', 'app.css'), path.join(publicDir, 'app.css'));
await cp(distDir, path.join(publicDir, 'dist'), { recursive: true });
