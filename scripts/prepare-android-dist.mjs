import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = join(root, "dist");
const target = join(root, "android", "app", "src", "main", "assets");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

// These files are development/design sources or assets unused by the shipped game.
const removable = [
    "monster/imgs/monsters.psd",
    "towers/imgs/towers.psd",
    "fonts/汉仪菱心体简.ttf",
    "imgs/background (1).jpg",
    "imgs/CannonTree.xmind",
    "sound/pekka_deploy_end_03.mp3",
    "sound/普通子弹.ogg",
    "sound/发射音效/地震.mp3",
    "sound/发射音效/雷电塔射击.mp3",
    "sound/发射音效/高科技激光.mp3",
    "sound/子弹音效/弓箭伤害.mp3",
    "sound/子弹音效/球闪.mp3",
];
for (const relative of removable) {
    await rm(join(target, relative), { force: true });
}

async function removeMaps(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await removeMaps(path);
        else if (entry.name.endsWith(".map") || entry.name.endsWith(".xmp")) {
            await rm(path, { force: true });
        }
    }
}
await removeMaps(target);
console.log(`Prepared Android assets at ${target}`);
