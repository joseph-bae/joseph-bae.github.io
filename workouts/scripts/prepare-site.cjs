const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const root = path.join(__dirname, '..', '..');
  const output = path.join(root, '_site');
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (['.git', '.github', '_site', 'node_modules'].includes(entry.name)) continue;
    const source = path.join(root, entry.name);
    const destination = path.join(output, entry.name);
    await fs.cp(source, destination, {
      recursive: true,
      filter: (item) => {
        const relative = path.relative(source, item).split(path.sep).join('/');
        return !(entry.name === 'workouts' && (relative === 'scripts' || relative.startsWith('scripts/')));
      },
    });
  }
  await fs.writeFile(path.join(output, '.nojekyll'), '', 'utf8');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
