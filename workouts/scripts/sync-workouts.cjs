const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../sheet-config.js');
const { parseGoogleSheetCsv } = require('../workout-import.js');

async function main() {
  const csvUrl = process.env.WORKOUTS_CSV_URL || config.csvUrl;
  if (!csvUrl) {
    console.log('WORKOUTS_CSV_URL is not configured; retaining the bundled workout data.');
    return;
  }
  const response = await fetch(csvUrl, { headers: { accept: 'text/csv,text/plain;q=0.9,*/*;q=0.1' } });
  if (!response.ok) throw new Error(`Google Sheets CSV returned HTTP ${response.status}`);
  const { profiles, profileNames } = parseGoogleSheetCsv(await response.text());
  for (const name of ['athlete1', 'athlete2', 'athlete3']) {
    if (!Array.isArray(profiles[name]) || profiles[name].length === 0) {
      throw new Error(`Import validation failed: no ${profileNames[name]} entries were parsed. Existing data was left intact.`);
    }
  }
  const updatedAt = new Date().toISOString();
  const output = `window.WORKOUT_PROFILES = ${JSON.stringify(profiles)};\nwindow.WORKOUT_PROFILE_NAMES = ${JSON.stringify(profileNames)};\nwindow.WORKOUT_DATA_UPDATED_AT = ${JSON.stringify(updatedAt)};\n`;
  await fs.writeFile(path.join(__dirname, '..', 'workouts.data.js'), output, 'utf8');
  console.log(`Imported ${Object.entries(profiles).map(([key, rows]) => `${profileNames[key]}: ${rows.length}`).join(', ')}; updated ${updatedAt}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
