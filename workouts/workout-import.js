/* Shared browser/Node importer for the published Google Sheets CSV. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WorkoutImporter = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && source[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += char;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function dateKey(value, yearHint, profile) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    let year, month, day;
    let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) [, year, month, day] = match.map(Number);
    else {
      match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (!match) return null;
      month = Number(match[1]); day = Number(match[2]);
      if (match[3]) {
        const yearText = match[3];
        year = Number(yearText);
        if (yearText.length === 2) year += year >= 70 ? 1900 : 2000;
        else if (yearText.length === 4 && yearText.startsWith('0')) year = 2000 + Number(yearText.slice(-2));
        if (profile === 'athlete1' && yearText === '0203' && month === 11 && day === 2) year = 2023;
        if (profile === 'athlete1' && yearText === '0205' && ((month === 6 && day === 17) || (month === 11 && day === 22))) year = 2025;
      } else year = yearHint || (profile === 'athlete3' ? 2025 : null);
    }
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Repair known mistyped year cells present in the source log.
    if (profile === 'athlete1' && year === 2034 && month === 1 && day === 18) year = 2024;
    if (year === 2027 && month === 6 && day === 28) year = 2026;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function cell(row, index) { return String(row[index] || '').trim(); }

  function parseGoogleSheetCsv(text) {
    const rows = parseCsv(text);
    const profiles = { athlete1: [], athlete2: [], athlete3: [] };
    const profileNames = {
      athlete1: cell(rows[0] || [], 2) || 'Athlete 1',
      athlete2: cell(rows[0] || [], 0) || 'Athlete 2',
      athlete3: cell(rows[0] || [], 8) || 'Athlete 3'
    };
    const state = {
      athlete1: { date: null, year: null, exercise: '' },
      athlete2: { date: null, year: null, exercise: '' },
      athlete3: { date: null, year: null, exercise: '' }
    };
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row.some((value) => String(value || '').trim())) continue;
      const sourceRow = i + 1;

      for (const profile of ['athlete1', 'athlete2', 'athlete3']) {
        const current = state[profile];
        const dateIndex = profile === 'athlete3' ? 7 : 2;
        const parsedDate = dateKey(cell(row, dateIndex), current.year, profile);
        if (parsedDate) {
          if (current.date !== parsedDate) current.exercise = '';
          current.date = parsedDate;
          current.year = Number(parsedDate.slice(0, 4));
        }
        const exerciseIndex = profile === 'athlete3' ? 9 : 4;
        const rawExercise = cell(row, exerciseIndex);
        const weight = profile === 'athlete2' ? cell(row, 0) : cell(row, profile === 'athlete3' ? 11 : 5);
        const setsReps = profile === 'athlete2' ? cell(row, 1) : cell(row, profile === 'athlete3' ? 12 : 6);
        const hasOwnEntry = profile === 'athlete2' ? Boolean(weight || setsReps) : Boolean(rawExercise || weight || setsReps);
        if (!hasOwnEntry || !current.date) continue;
        const continued = !rawExercise && Boolean(current.exercise);
        let exercise = rawExercise || current.exercise;
        if (!exercise) continue;
        if (rawExercise && !/^[-–—]?\s*both arms?\s*$/i.test(rawExercise)) current.exercise = rawExercise;
        else if (/^[-–—]?\s*both arms?\s*$/i.test(rawExercise)) exercise = current.exercise || rawExercise;
        profiles[profile].push({
          date: current.date,
          bodyWeight: profile === 'athlete3' ? cell(row, 8) : '',
          exercise,
          rawExercise,
          weight,
          setsReps,
          continued,
          sourceRow
        });
      }
    }
    return { profiles, profileNames };
  }

  return { parseCsv, parseGoogleSheetCsv };
});
