// Bhoomisetu — Database Reset Script
// Wipes ./data and ./storage, then re-seeds

import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const storageDir = path.join(process.cwd(), 'storage');

console.log('🗑️  Resetting Bhoomisetu database...');

// Remove data directory
if (fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log('   Removed ./data');
}

// Remove storage directory
if (fs.existsSync(storageDir)) {
  fs.rmSync(storageDir, { recursive: true, force: true });
  console.log('   Removed ./storage');
}

// Re-create directories
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(storageDir, 'uploads'), { recursive: true });
console.log('   Re-created directories');

async function reset() {
  // Run seed (which runs migrate first)
  console.log('   Running seed...\n');
  await import('./seed');
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});

