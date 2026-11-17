/**
 * One-off asset fetch. Images are committed to the repository, so neither the
 * build nor the deployed site depends on the network or a third-party host.
 *
 * Usage: node scripts/fetch-images.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = join(process.cwd(), 'public', 'images');

const assets = [
  { file: 'hero-salon.jpg', width: 1600, ids: ['1560066984-138dadb4c035', '1521590832167-7bcbfaa6381f'] },
  { file: 'map.jpg', width: 1400, ids: ['1512453979798-5ea266f8880c'] },
  { file: 'services/haircut.jpg', width: 900, ids: ['1562322140-8baeececf3df', '1580618672591-eb180b1a973f'] },
  { file: 'services/color.jpg', width: 900, ids: ['1512496015851-a90fb38ba796', '1522337360788-8b13dee7a37e'] },
  { file: 'services/keratin.jpg', width: 900, ids: ['1595476108010-b4d1f102b1b1', '1633681926022-84c23e8cb2d6'] },
  { file: 'services/makeup.jpg', width: 900, ids: ['1487412947147-5cebf100ffc2', '1516975080664-ed2fc6a32937'] },
  { file: 'services/nails.jpg', width: 900, ids: ['1600948836101-f9ffda59d250', '1610992015732-2449b76344bc'] },
  { file: 'services/brows.jpg', width: 900, ids: ['1610992015732-2449b76344bc', '1487412947147-5cebf100ffc2'] },
  { file: 'services/skin.jpg', width: 900, ids: ['1570172619644-dfd03ed5d881', '1516975080664-ed2fc6a32937'] },
  { file: 'services/lashes.jpg', width: 900, ids: ['1595476108010-b4d1f102b1b1', '1583001931096-959e9a1a6223'] },
  { file: 'team/sara.jpg', width: 500, ids: ['1494790108377-be9c29b29330', '1544005313-94ddf0286df2'], faces: true },
  { file: 'team/maryam.jpg', width: 500, ids: ['1531123897727-8f129e1688ce', '1524504388940-b1c1722653e1'], faces: true },
  { file: 'team/negar.jpg', width: 500, ids: ['1524504388940-b1c1722653e1', '1438761681033-6461ffad8d80'], faces: true },
  { file: 'avatars/a1.jpg', width: 200, ids: ['1494790108377-be9c29b29330'], faces: true },
  { file: 'avatars/a2.jpg', width: 200, ids: ['1524504388940-b1c1722653e1'], faces: true },
  { file: 'avatars/a3.jpg', width: 200, ids: ['1531123897727-8f129e1688ce'], faces: true },
  { file: 'avatars/a4.jpg', width: 200, ids: ['1544005313-94ddf0286df2'], faces: true },
  { file: 'gallery/1.jpg', width: 900, ids: ['1521590832167-7bcbfaa6381f'] },
  { file: 'gallery/2.jpg', width: 900, ids: ['1487412947147-5cebf100ffc2'] },
  { file: 'gallery/3.jpg', width: 900, ids: ['1600948836101-f9ffda59d250'] },
  { file: 'gallery/4.jpg', width: 900, ids: ['1570172619644-dfd03ed5d881'] },
  { file: 'gallery/5.jpg', width: 900, ids: ['1595476108010-b4d1f102b1b1'] },
  { file: 'gallery/6.jpg', width: 900, ids: ['1562322140-8baeececf3df'] },
];

const buildUrl = (id, width, faces) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=72&auto=format&fit=crop${faces ? '&crop=faces' : ''}`;

const download = async (url) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length > 8000 ? buffer : null;
};

let failures = 0;

for (const asset of assets) {
  let saved = false;
  for (const id of asset.ids) {
    const buffer = await download(buildUrl(id, asset.width, asset.faces));
    if (!buffer) continue;
    const target = join(ROOT, asset.file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
    console.log(`saved ${asset.file} (${Math.round(buffer.length / 1024)} kB)`);
    saved = true;
    break;
  }
  if (!saved) {
    failures += 1;
    console.error(`FAILED ${asset.file}`);
  }
}

if (failures > 0) process.exitCode = 1;
