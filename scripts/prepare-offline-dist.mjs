import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist-offline/', import.meta.url);
const rootPath = root.pathname;

async function removeIfPresent(path) {
  try {
    await rm(new URL(path, root), { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Unable to remove ${path}: ${error.message}`);
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

// These files are design sources or debug metadata. They are not read by the
// browser runtime and make the downloadable package much larger.
for (const path of [
  'monster/imgs/monsters.psd',
  'towers/imgs/towers.psd',
  'imgs/CannonTree.xmind',
  'fonts/汉仪菱心体简.ttf',
]) {
  await removeIfPresent(path);
}

for (const file of await walk(rootPath)) {
  if (file.endsWith('.map')) await rm(file, { force: true });
}

// The source predates Vite's relative base support and contains a few public
// asset URLs beginning with '/'. Rewrite only known local asset roots so the
// ZIP works under any static server path.
const localRoots = '(?:sound|imgs|towers|monster|icon|fonts|NOTE|favicon\\.ico)';
const rootUrl = new RegExp("([\\\"'`(])\\/" + `(${localRoots})`, 'g');

for (const file of await walk(rootPath)) {
  if (!/\.(html|js|css)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  const rewritten = source.replace(rootUrl, '$1./$2');
  if (rewritten !== source) {
    await writeFile(file, rewritten);
  }
}

await writeFile(
  join(rootPath, 'OFFLINE-README.txt'),
  `HitWar Offline Single-Player\n\n` +
    `This package contains the standalone single-player build.\n` +
    `It uses only local HTML, JavaScript, CSS, images, audio and save data.\n\n` +
    `Run from the package directory:\n` +
    `  python3 -m http.server 3000\n\n` +
    `Then open http://127.0.0.1:3000/\n`,
);

const indexPath = join(rootPath, 'index.html');
await stat(indexPath);

const generatedFiles = (await walk(rootPath))
  .filter((file) => /\.(html|js|css)$/.test(file))
const generatedSources = (await Promise.all(generatedFiles.map((file) => readFile(file, 'utf8')))).join('\n');
const generatedJavaScript = (await Promise.all(
  generatedFiles.filter((file) => file.endsWith('.js')).map((file) => readFile(file, 'utf8')),
)).join('\n');
if (/colyseus|(?:ws|wss):\/\//i.test(generatedJavaScript)) {
  throw new Error('Offline bundle still contains multiplayer transport code');
}
if (/(?:["'`])\/(?:sound|imgs|towers|monster|icon|fonts|NOTE)(?:\/|["'`])/.test(generatedSources)) {
  throw new Error('Offline bundle still contains an absolute local asset URL');
}
console.log(`Prepared offline static package: ${relative(process.cwd(), rootPath)}`);
