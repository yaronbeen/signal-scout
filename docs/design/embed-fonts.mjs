// Make the portable concept independent of both network and neighboring assets.
// Authoring still uses the local source fonts; this step embeds their exact bytes.
import fs from 'node:fs/promises';
const file = new URL('./world-class-concept.html', import.meta.url);
let html = await fs.readFile(file, 'utf8');
for (const name of ['Geist-Regular.ttf', 'Geist-Semibold.ttf']) {
  const bytes = await fs.readFile(new URL(`./assets/${name}`, import.meta.url));
  html = html.replace(`url('assets/${name}')`, `url('data:font/ttf;base64,${bytes.toString('base64')}')`);
}
await fs.writeFile(file, html);
console.log('Embedded local Geist font bytes; portable concept requires no network assets.');
