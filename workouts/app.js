(() => {
  // Client-side gate for a casual private page. Change this before publishing.
  const ACCESS_PASSWORD = 'fighton';
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const SET_COLORS = ['#85001c','#c99c4b','#ad3548','#e1c381','#651123','#b98031','#d5787d','#9d7a3e','#822e45','#d3a957','#b75461','#b6a174','#692637','#c18952','#d39599','#d7c9ab'];
  const $ = (id) => document.getElementById(id);
  const today = new Date(); today.setHours(0,0,0,0);
  let shownMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let annualYear = today.getFullYear();
  let selectedDate = '';
  let activeLift = '';
  let activeView = 'calendar';
  const compact = (value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 });

  function canonicalExercise(value) {
    let name = String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
    name = name.replace(/dumbell|dumbel/g, 'dumbbell').replace(/\bdb\b/g, 'dumbbell').replace(/&|\+/g, ' and ');
    name = name.replace(/[-‐‑–—]/g, ' ').replace(/[.,_'’()]/g, ' ').replace(/\s+/g, ' ').trim();
    name = name.replace(/\bpull\s*ups?\b/g, 'pull up').replace(/\bpush\s*ups?\b/g, 'push up').replace(/\bchin\s*ups?\b/g, 'chin up').replace(/\bsit\s*ups?\b/g, 'sit up');
    name = name.replace(/\bdead\s*lift(s?)\b/g, 'deadlift$1').replace(/\bbar\s*bell\b/g, 'barbell').replace(/\bdumb\s*bell\b/g, 'dumbbell');
    name = name.replace(/\blat\s*pull\s*down(s?)\b/g, 'lat pulldown').replace(/\bpull\s*down(s?)\b/g, 'pulldown');
    if (name === 'lat') name = 'lat pulldown';
    if (/\blat\s+raises?\b/.test(name)) name = name.replace(/\blat\s+raises?\b/g, 'lateral raise');
    else if (/\breverse\s+lat\b/.test(name)) name = name.replace(/\breverse\s+lat\b/g, 'reverse grip lat pulldown');
    else name = name.replace(/\blat\b(?!\s+pulldown)/g, 'lat pulldown');
    name = name.replace(/\bohp\b/g, 'overhead press').replace(/\bbp\b/g, 'bench press');
    name = name.replace(/\bbarbell\s+bench(?:\s+press)?\b/g, 'bench press');
    name = name.replace(/\bbench\b(?!\s+press)/g, 'bench press');
    name = name.replace(/\bshoulder\s+press\b/g, 'overhead press');
    if (name === 'press') name = 'overhead press';
    name = name.replace(/\s+/g, ' ').trim();
    return { key: name, label: name.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase()) };
  }

  function oneSmallSpellingDifference(first, second) {
    if (first === second) return true;
    if (Math.abs(first.length-second.length)>1 || Math.min(first.length,second.length)<4) return false;
    let left=0, right=0, edits=0;
    while (left<first.length && right<second.length) {
      if (first[left]===second[right]) { left++; right++; continue; }
      edits++;
      if (edits>1) return false;
      if (first.length===second.length) { left++; right++; }
      else if (first.length>second.length) left++;
      else right++;
    }
    if (left<first.length || right<second.length) edits++;
    return edits<=1;
  }

  function sameExerciseWithSmallTypo(first, second) {
    const firstWords=first.split(' '), secondWords=second.split(' ');
    if (firstWords.length!==secondWords.length) return false;
    let changed=0;
    for (let i=0;i<firstWords.length;i++) {
      if (firstWords[i]===secondWords[i]) continue;
      if (!oneSmallSpellingDifference(firstWords[i],secondWords[i])) return false;
      changed++;
      if (changed>1) return false;
    }
    return changed===1;
  }

  function parseSingleWeight(value) {
    const raw = String(value || '').trim();
    const dumbbell = raw.match(/^\s*(\d+(?:\.\d+)?)\s*s\s*$/i);
    if (dumbbell) return { pounds:Number(dumbbell[1]), label:`${compact(Number(dumbbell[1]))} lb each` };
    const cleaned = raw.replace(/,(?=\d{3}(?:\D|$))/g, '');
    const match = cleaned.match(/^\s*(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|lb|lbs|pounds?|#)?\s*(each|per\s+hand|\/\s*side|\/\s*hand|total|dbs?|kbs?)?\s*$/i);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = (match[2] || 'lb').toLowerCase();
    const kilograms = /^kg|kilogram/.test(unit);
    const suffix = match[3] ? ` ${match[3].toLowerCase().replace(/\s+/g, ' ')}` : '';
    return { pounds:amount*(kilograms?2.2046226218:1), label:`${compact(amount)} ${kilograms?'kg':'lb'}${suffix}` };
  }

  function parseWeight(value, prescribedSets=null) {
    const raw = String(value || '').trim();
    if (!raw) return { pounds:null, loads:[], label:'' };
    const parts = raw.split(',').map((part)=>part.trim());
    const parsedParts=parts.length>1&&parts.every(Boolean)?parts.map(parseSingleWeight):[];
    if (parsedParts.length>1 && parsedParts.every(Boolean) && parts.length===prescribedSets) return { pounds:Math.max(...parsedParts.map((part)=>part.pounds)), loads:parsedParts.map((part)=>part.pounds), label:parsedParts.map((part)=>part.label).join(', ') };
    if (parsedParts.length>1 && parsedParts.every(Boolean)) {
      const thousands=parseSingleWeight(raw);
      if (thousands && thousands.pounds<=5000) return { ...thousands, loads:[thousands.pounds] };
      return { pounds:Math.max(...parsedParts.map((part)=>part.pounds)), loads:parsedParts.map((part)=>part.pounds), label:parsedParts.map((part)=>part.label).join(', ') };
    }
    const single = parseSingleWeight(raw);
    if (single) return { ...single, loads:[single.pounds] };
    return { pounds:null, loads:[], label:raw };
  }

  function parsePrescription(value) {
    const raw = String(value || '').trim();
    if (!raw) return { sets: null, reps: null, timed: false };
    const normalized = raw.toLocaleLowerCase()
      .replace(/(\d+)\s*\.\s*x\s*(\d+)/g, '$1x$2')
      .replace(/\bsets?\s+of\s+/g, 'x')
      .replace(/\bsets?\b/g, 'x')
      .replace(/\breps?\b/g, '')
      .replace(/x\s*x/g, 'x')
      .replace(/\beach\s*$/g, '')
      .replace(/\s+/g, ' ');
    const match = normalized.match(/^\s*(\d+(?:\.\d+)?)\s*(?:x|×|\*)\s*(\d+(?:\.\d+)?)\s*(sec(?:ond)?s?|seconds?)?\s*$/i);
    return match ? { sets: Number(match[1]), reps: Number(match[2]), timed: Boolean(match[3]) } : { sets: null, reps: null, timed: false };
  }

  function prepareEntries(sourceRows) {
    const prepared = sourceRows.map((row,index)=>{
      const [year,month,day]=row.date.split('-').map(Number);
      const date=new Date(year,month-1,day);
      const exercise=canonicalExercise(row.exercise);
      const prescription=parsePrescription(row.setsReps);
      const weight=parseWeight(row.weight,prescription.sets);
      const usable=weight.loads.length>0 && prescription.sets!==null && prescription.reps!==null && !prescription.timed && (weight.loads.length===1 || weight.loads.length===prescription.sets);
      const volume=usable ? (weight.loads.length===1 ? weight.loads[0]*prescription.sets*prescription.reps : weight.loads.reduce((sum,load)=>sum+load,0)*prescription.reps) : null;
      return { ...row,index,date,dateKey:row.date,rawExercise:String(row.rawExercise ?? row.exercise).trim(),continued:Boolean(row.continued),exercise:exercise.label,liftKey:exercise.key,rawWeight:String(row.weight||'').trim(),weightLabel:weight.label,weight:weight.pounds,loads:weight.loads,sets:prescription.sets,reps:prescription.reps,timed:prescription.timed,volume };
    }).filter((row)=>row.dateKey && row.exercise);
    const nameCounts=new Map();
    prepared.forEach((row)=>nameCounts.set(row.liftKey,(nameCounts.get(row.liftKey)||0)+1));
    const exerciseNames=[...nameCounts.entries()].sort((a,b)=>b[1]-a[1]);
    const canonicalNames=[],typoAliases=new Map();
    exerciseNames.forEach(([name])=>{const match=canonicalNames.find((candidate)=>sameExerciseWithSmallTypo(name,candidate));if(match)typoAliases.set(name,match);else canonicalNames.push(name)});
    prepared.forEach((row)=>{const matched=typoAliases.get(row.liftKey);if(matched){row.liftKey=matched;row.exercise=matched.replace(/\b\w/g,(letter)=>letter.toLocaleUpperCase())}});
    return prepared;
  }

  const PROFILE_KEYS=['athlete1','athlete2','athlete3'];
  const profileNames=Object.assign({athlete1:'Athlete 1',athlete2:'Athlete 2',athlete3:'Athlete 3'},window.WORKOUT_PROFILE_NAMES||{});
  const PROFILE_INFO=Object.fromEntries(PROFILE_KEYS.map((key)=>[key,{name:profileNames[key],initial:Array.from(profileNames[key])[0]||'?'}]));
  const profileEntries=Object.fromEntries(Object.entries(window.WORKOUT_PROFILES||{}).map(([key,rows])=>[key,prepareEntries(rows)]));
  let activeProfileKey=profileEntries.athlete1 ? 'athlete1' : Object.keys(profileEntries)[0];
  let entries=profileEntries[activeProfileKey]||[];
  function buildDateIndex(rows){const index=new Map();for(const row of rows){if(!index.has(row.dateKey))index.set(row.dateKey,[]);index.get(row.dateKey).push(row)}return index}
  let byDate=buildDateIndex(entries);
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const longDate = (date) => new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(date);
  const shortDate = (date) => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric' }).format(date);
  const keyFor = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const workoutLabel = (entry) => `${entry.exercise}${entry.weightLabel ? ` · ${entry.weightLabel}` : ''}${entry.setsReps ? ` · ${entry.setsReps}` : ''}`;

  const SHEET_REFRESH_COOLDOWN=5*60*1000;
  const SHEET_REFRESH_KEY='workout-log-last-live-refresh';
  let refreshInProgress=false;
  let lastSheetRefresh=0;
  try{lastSheetRefresh=Number(localStorage.getItem(SHEET_REFRESH_KEY)||0)||0;}catch(_error){}
  function setSyncStatus(message, state='ready') {
    $('syncStatusText').textContent=message;
    $('syncStatus').dataset.state=state;
  }
  function formatSyncTime(value) {
    if(!value)return '';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'':date.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function updateRefreshButton() {
    const button=$('refreshData');
    const csvUrl=String(window.WORKOUTS_CONFIG&&window.WORKOUTS_CONFIG.csvUrl||'').trim();
    if(!csvUrl){button.disabled=true;button.textContent='Connect sheet';button.title='Add the published CSV URL in sheet-config.js to enable refresh';return;}
    if(refreshInProgress){button.disabled=true;button.textContent='Refreshing…';return;}
    const remaining=lastSheetRefresh+SHEET_REFRESH_COOLDOWN-Date.now();
    if(remaining>0){button.disabled=true;button.textContent=`Refresh in ${Math.ceil(remaining/60000)} min`;return;}
    button.disabled=false;button.textContent='Refresh data';
  }
  function refreshImportedProfiles(imported, updatedAt) {
    const {profiles:profileRows,profileNames:newNames}=imported;
    const preparedProfiles={};
    for(const key of PROFILE_KEYS){
      if(!Array.isArray(profileRows[key])||profileRows[key].length===0)throw new Error(`No ${PROFILE_INFO[key].name} entries were found in the sheet.`);
      preparedProfiles[key]=prepareEntries(profileRows[key]);
    }
    Object.assign(profileEntries,preparedProfiles);
    for(const key of PROFILE_KEYS){
      profileNames[key]=String(newNames[key]||`Athlete ${key.slice(-1)}`);
      PROFILE_INFO[key]={name:profileNames[key],initial:Array.from(profileNames[key])[0]||'?'};
    }
    window.WORKOUT_PROFILES=profileRows;
    window.WORKOUT_PROFILE_NAMES=profileNames;
    window.WORKOUT_DATA_UPDATED_AT=updatedAt;
    updateProfileLabels();
    entries=profileEntries[activeProfileKey]||[];
    byDate=buildDateIndex(entries);
    renderCalendar();
    if(selectedDate)renderDay(selectedDate);
    if(activeView==='log')renderLog();
    if(activeView==='annual')renderAnnualOverview();
    if(activeView==='stats')renderProfileStats();
  }
  async function refreshFromSheet() {
    if(refreshInProgress)return;
    const csvUrl=String(window.WORKOUTS_CONFIG&&window.WORKOUTS_CONFIG.csvUrl||'').trim();
    if(!csvUrl)return;
    refreshInProgress=true;updateRefreshButton();setSyncStatus('Fetching latest Google Sheet…','loading');
    try{
      const freshUrl=new URL(csvUrl,window.location.href);
      freshUrl.searchParams.set('_refresh',String(Date.now()));
      const response=await fetch(freshUrl.toString(),{cache:'no-store',headers:{accept:'text/csv,text/plain;q=0.9,*/*;q=0.1'}});
      if(!response.ok)throw new Error(`Sheet returned HTTP ${response.status}.`);
      const imported=window.WorkoutImporter.parseGoogleSheetCsv(await response.text());
      const updatedAt=new Date().toISOString();
      refreshImportedProfiles(imported,updatedAt);
      lastSheetRefresh=Date.now();
      try{localStorage.setItem(SHEET_REFRESH_KEY,String(lastSheetRefresh));}catch(_error){}
      $('refreshData').title='Fetch the latest workout sheet data';
      setSyncStatus(`Sheet refreshed ${formatSyncTime(updatedAt)}`,'ready');
    }catch(error){
      $('refreshData').title=`Refresh failed: ${error&&error.message?error.message:'unknown error'}`;
      setSyncStatus('Refresh failed · showing saved data','error');
      console.error('Workout sheet refresh failed:',error);
    }finally{refreshInProgress=false;updateRefreshButton();}
  }
  const initialSyncTime=formatSyncTime(window.WORKOUT_DATA_UPDATED_AT);
  setSyncStatus(initialSyncTime?`Imported ${initialSyncTime}`:'Saved workout data', 'ready');
  updateRefreshButton();
  window.setInterval(updateRefreshButton,30000);

  function renderLog() {
    const query=$('logSearch').value.trim().toLocaleLowerCase();
    const rows=[...entries].sort((a,b)=>b.date-a.date||b.index-a.index).filter((row)=>!query||row.exercise.toLocaleLowerCase().includes(query)||row.rawExercise.toLocaleLowerCase().includes(query));
    $('logRows').innerHTML=rows.map((row)=>`<tr><td>${escapeHTML(longDate(row.date))}</td><td><button class="log-lift-link" type="button" data-lift="${escapeHTML(row.liftKey)}">${escapeHTML(row.exercise)}</button>${row.rawExercise&&row.rawExercise.toLocaleLowerCase()!==row.exercise.toLocaleLowerCase()?`<span class="log-original">${escapeHTML(row.rawExercise)}</span>`:''}</td><td>${escapeHTML(row.weightLabel||'—')}</td><td>${escapeHTML(row.setsReps||'—')}</td><td>${row.volume===null?'—':`${compact(row.volume)} lb`}</td></tr>`).join('');
    $('logEmpty').hidden=rows.length>0;
    $('logCount').textContent=`Showing ${rows.length.toLocaleString()} of ${entries.length.toLocaleString()} entries`;
  }

  function renderProfileStats() {
    const dateKeys=[...new Set(entries.map((row)=>row.dateKey))].sort();
    let longest=0,streak=0,previous=null;
    for(const dateKey of dateKeys){const date=new Date(`${dateKey}T00:00:00Z`);const consecutive=previous&&date-previous===86400000;streak=consecutive?streak+1:1;longest=Math.max(longest,streak);previous=date;}
    const monthVolumes=new Map();
    entries.forEach((row)=>{const month=row.dateKey.slice(0,7);monthVolumes.set(month,(monthVolumes.get(month)||0)+(row.volume||0));});
    const topMonth=[...monthVolumes].sort((a,b)=>b[1]-a[1])[0];
    const cumulativeVolume=entries.reduce((sum,row)=>sum+(row.volume||0),0);
    const firstWorkout=dateKeys[0];
    const liftDays=new Map();
    entries.forEach((row)=>{if(row.weight===null)return;if(!liftDays.has(row.liftKey))liftDays.set(row.liftKey,new Map());const days=liftDays.get(row.liftKey);days.set(row.dateKey,Math.max(days.get(row.dateKey)||0,row.weight));});
    let biggest={name:'—',increase:0};
    for(const [name,days] of liftDays){const values=[...days].sort((a,b)=>a[0].localeCompare(b[0]));if(values.length<2)continue;const increase=values.at(-1)[1]-values[0][1];if(increase>biggest.increase)biggest={name:name.replace(/\b\w/g,c=>c.toLocaleUpperCase()),increase};}
    const stats=[['Cumulative weight lifted',cumulativeVolume?`${compact(cumulativeVolume)} lb`:'—','total across all logged workouts'],['First recorded workout',firstWorkout?longDate(new Date(`${firstWorkout}T12:00:00`)):'—','earliest date in this training history'],['Training days',dateKeys.length.toLocaleString(),'days logged'],['Longest streak',`${longest} ${longest===1?'day':'days'}`,'consecutive training days'],['Most volume in a month',topMonth&&topMonth[1]?`${compact(topMonth[1])} lb`:'—',topMonth?new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(`${topMonth[0]}-01T12:00:00`)):'tracked volume'],['Biggest lift increase',biggest.increase>0?`+${compact(biggest.increase)} lb`:'—',biggest.increase>0?`${biggest.name} · first to latest`:'not enough history yet']];
    $('statsTitle').textContent=`${PROFILE_INFO[activeProfileKey].name}’s stats`;
    $('funStatsGrid').innerHTML=stats.map(([label,value,note])=>`<article class="fun-stat"><span class="metric-label">${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><span>${escapeHTML(note)}</span></article>`).join('');
    const targets=[['Bench press',name=>/\bbench press\b/.test(name)],['Squat',name=>/^squat$/.test(name)||/^barbell squat$/.test(name)],['Overhead press',name=>/\boverhead press\b/.test(name)],['Lat pulldown',name=>/\blat pulldown\b/.test(name)],['Barbell row',name=>/barbell.*\brow\b/.test(name)]];
    $('maxLiftsGrid').innerHTML=targets.map(([label,match])=>{const best=entries.filter(row=>row.weight!==null&&match(row.liftKey)).reduce((max,row)=>Math.max(max,row.weight),0);return `<div class="max-lift"><span>${label}</span><strong>${best?`${compact(best)} lb`:'—'}</strong></div>`}).join('');
  }

  function renderAnnualOverview() {
    $('annualYearTitle').textContent=annualYear;
    $('annualCalendar').innerHTML=MONTHS.map((monthName,monthIndex)=>{
      const firstDay=new Date(annualYear,monthIndex,1);
      const offset=(firstDay.getDay()+6)%7;
      const dayCount=new Date(annualYear,monthIndex+1,0).getDate();
      const cellCount=Math.ceil((offset+dayCount)/7)*7;
      const monthDays=[];
      let workoutDays=0;
      for(let cell=0;cell<cellCount;cell++){
        const day=cell-offset+1;
        if(day<1||day>dayCount){monthDays.push('<span class="annual-day empty" aria-hidden="true"></span>');continue;}
        const dateKey=`${annualYear}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const date=new Date(annualYear,monthIndex,day);
        const count=(byDate.get(dateKey)||[]).length;
        if(count)workoutDays++;
        const classes=['annual-day',count?'has-workout':'',selectedDate===dateKey?'selected':''].filter(Boolean).join(' ');
        const label=`${longDate(date)}${count?`, ${count} ${count===1?'workout entry':'workout entries'}`:''}`;
        monthDays.push(`<button class="${classes}" type="button" data-annual-date="${dateKey}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${day}</button>`);
      }
      const weekdays=['M','T','W','T','F','S','S'].map((day)=>`<span>${day}</span>`).join('');
      return `<article class="annual-month"><div class="annual-month-label"><h3>${monthName}</h3><span>${workoutDays} ${workoutDays===1?'day':'days'}</span></div><div class="annual-month-calendar"><div class="annual-weekdays" aria-hidden="true">${weekdays}</div><div class="annual-days">${monthDays.join('')}</div></div></article>`;
    }).join('');
  }

  function setView(view) {
    if(!['calendar','annual','log','stats'].includes(view))return;
    activeView=view;
    document.querySelectorAll('[data-page-view]').forEach(page=>{page.hidden=page.dataset.pageView!==view;});
    $('calendarOverview').hidden=view!=='calendar';
    document.querySelectorAll('[data-view]').forEach(tab=>tab.classList.toggle('active',tab.dataset.view===view));
    if(view==='log')renderLog();
    if(view==='annual')renderAnnualOverview();
    if(view==='stats')renderProfileStats();
  }

  function updateStats() {
    const monthPrefix = `${shownMonth.getFullYear()}-${String(shownMonth.getMonth()+1).padStart(2,'0')}`;
    const monthRows = entries.filter((entry) => entry.dateKey.startsWith(monthPrefix));
    const days = new Set(monthRows.map((entry) => entry.dateKey)).size;
    const volume = monthRows.reduce((sum, entry) => sum + (entry.volume || 0), 0);
    $('statDays').textContent = days;
    $('statDaysNote').textContent = `in ${MONTHS[shownMonth.getMonth()]}`;
    $('statEntries').textContent = monthRows.length.toLocaleString();
    $('statEntriesNote').textContent = `across ${days} ${days === 1 ? 'session' : 'sessions'}`;
    $('statVolume').textContent = volume ? `${compact(volume)} lb` : '—';
  }

  function renderCalendar() {
    $('monthTitle').textContent = `${MONTHS[shownMonth.getMonth()]} ${shownMonth.getFullYear()}`;
    const first = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(first.getDate() - offset);
    const dayCount = new Date(shownMonth.getFullYear(), shownMonth.getMonth()+1, 0).getDate();
    const totalCells = Math.ceil((offset + dayCount) / 7) * 7;
    let html = '';
    for (let i = 0; i < totalCells; i++) {
      const day = new Date(start); day.setDate(start.getDate()+i);
      const dateKey = keyFor(day), rows = byDate.get(dateKey) || [];
      const classes = ['calendar-day', day.getMonth() !== shownMonth.getMonth() ? 'outside' : '', keyFor(day) === keyFor(today) ? 'today' : '', dateKey === selectedDate ? 'selected' : '', rows.length ? 'has-workout' : ''].filter(Boolean).join(' ');
      const exerciseLines = rows.slice(0, 2).map((row) => `<span class="calendar-exercise" title="${escapeHTML(workoutLabel(row))}">${escapeHTML(workoutLabel(row))}</span>`).join('');
      const more = rows.length > 2 ? `<span class="more-workouts">+${rows.length - 2} more</span>` : '';
      html += `<button class="${classes}" type="button" data-date="${dateKey}" aria-label="${escapeHTML(longDate(day))}${rows.length ? `, ${rows.length} workout entries` : ''}"><span class="day-number">${day.getDate()}</span>${rows.length ? `<span class="calendar-workouts">${exerciseLines}${more}</span>` : ''}</button>`;
    }
    $('calendarGrid').innerHTML = html;
    updateStats();
  }

  function closeProfileMenu() {
    $('profileMenu').hidden=true;
    $('profileButton').setAttribute('aria-expanded','false');
  }

  function updateProfileLabels() {
    const profile=PROFILE_INFO[activeProfileKey];
    if(profile){
      $('profileName').textContent=profile.name;
      $('profileInitial').textContent=profile.initial;
      $('topAvatar').textContent=profile.initial;
      $('topAvatar').setAttribute('aria-label',`${profile.name} stats`);
      $('statsTitle').textContent=`${profile.name}’s stats`;
    }
    $('profileMenu').querySelectorAll('[data-profile]').forEach((option)=>{
      const info=PROFILE_INFO[option.dataset.profile];
      if(!info)return;
      option.querySelector('.profile-initial').textContent=info.initial;
      option.querySelector('.profile-name').textContent=info.name;
    });
  }

  function changeProfile(profileKey) {
    if (!profileEntries[profileKey] || !PROFILE_INFO[profileKey]) return;
    activeProfileKey=profileKey;
    entries=profileEntries[profileKey];
    byDate=buildDateIndex(entries);
    updateProfileLabels();
    $('profileMenu').querySelectorAll('[data-profile]').forEach((option)=>option.classList.toggle('active',option.dataset.profile===profileKey));
    closeProfileMenu();
    renderCalendar();
    if (selectedDate) renderDay(selectedDate);
    if(activeView==='log')renderLog();
    if(activeView==='annual')renderAnnualOverview();
    if(activeView==='stats')renderProfileStats();
  }

  function renderDay(dateKey) {
    selectedDate = dateKey;
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month-1, day);
    const rows = byDate.get(dateKey) || [];
    $('dayTitle').textContent = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
    $('dayEyebrow').textContent = rows.length ? 'YOUR SESSION' : 'REST DAY';
    $('sessionTag').textContent = rows.length ? `${rows.length} ${rows.length === 1 ? 'ENTRY' : 'ENTRIES'}` : 'NO LOG';
    const bodyWeight = rows.find((row) => row.bodyWeight);
    const bodyNote = bodyWeight ? `<div class="bodyweight-note">Body weight <b>${escapeHTML(bodyWeight.bodyWeight)} lb</b></div>` : '';
    if (!rows.length) {
      $('dayContent').innerHTML = `<div class="empty-day"><span class="empty-spark">✳</span><p>No workout logged on this date.</p><span class="empty-caption">A recovery day is part of the work.</span></div>`;
      $('dayFootText').textContent = 'Rest is training, too.';
    } else {
      const total = rows.reduce((sum, row) => sum + (row.volume || 0), 0);
      $('dayContent').innerHTML = `${bodyNote}<div class="workout-list">${rows.map((row, index) => `<div class="workout-row"><span class="workout-index">${String(index+1).padStart(2,'0')}</span><button class="workout-open" type="button" data-lift="${escapeHTML(row.exercise)}"><strong>${escapeHTML(row.exercise)}</strong><span>${escapeHTML([row.weightLabel, row.setsReps].filter(Boolean).join(' · ') || 'Details not recorded')}</span></button>${row.volume ? `<span class="workout-volume">${compact(row.volume)} lb</span>` : ''}</div>`).join('')}</div>`;
      $('dayFootText').textContent = total ? `${compact(total)} lb tracked volume` : `${rows.length} logged ${rows.length === 1 ? 'movement' : 'movements'}`;
    }
    renderCalendar();
  }

  function liftHistory(lift) { return entries.filter((row) => row.liftKey === lift.trim().toLocaleLowerCase()); }
  function renderChart(history) {
    const dayMap = new Map();
    history.forEach((row) => {
      if (!dayMap.has(row.dateKey)) dayMap.set(row.dateKey, { date:row.date, dateKey:row.dateKey, segments:new Map(), records:[], maxWeight:null });
      const day = dayMap.get(row.dateKey);
      day.records.push(row);
      if (row.weight !== null && (day.maxWeight === null || row.weight > day.maxWeight)) day.maxWeight = row.weight;
      if (row.volume !== null) {
        const composition = `${row.sets}x${row.reps}`;
        if (!day.segments.has(composition)) day.segments.set(composition, { sets:row.sets, reps:row.reps, volume:0, records:[] });
        const segment = day.segments.get(composition);
        segment.volume += row.volume;
        segment.records.push(row);
      }
    });
    const plotted = [...dayMap.values()].sort((a,b)=>a.date-b.date);
    const compositions = [...new Set(plotted.flatMap((day)=>[...day.segments.keys()]))]
      .sort((a,b)=>{const [as,ar]=a.split('x').map(Number),[bs,br]=b.split('x').map(Number);return as-bs||ar-br});
    const compositionColors = new Map(compositions.map((composition,index)=>[composition,SET_COLORS[index%SET_COLORS.length]]));
    const svg = $('volumeChart');
    const width = Math.max(660, plotted.length * 42 + 92), height = 250;
    const margin = { top:14, right:47, bottom:35, left:52 }, plotW = width-margin.left-margin.right, plotH = height-margin.top-margin.bottom;
    const maxValue = Math.max(1, ...plotted.map((day) => [...day.segments.values()].reduce((sum,segment)=>sum+segment.volume,0)));
    const volumeStep = maxValue > 2000 ? 500 : maxValue > 500 ? 100 : 50;
    const niceMax = Math.ceil(maxValue / volumeStep) * volumeStep;
    const maxWeight = Math.max(1, ...plotted.map((day)=>day.maxWeight || 0));
    const weightStep = maxWeight > 500 ? 100 : maxWeight > 200 ? 50 : maxWeight > 100 ? 25 : maxWeight > 50 ? 10 : 5;
    const niceWeightMax = Math.ceil(maxWeight / weightStep) * weightStep;
    let markup = '', volumeAxisMarkup = '', weightAxisMarkup = '';
    for (let i=0;i<=4;i++) {
      const volumeValue = (niceMax/4)*i, weightValue = (niceWeightMax/4)*i, y = margin.top+plotH-(i/4)*plotH;
      markup += `<line x1="${margin.left}" y1="${y}" x2="${width-margin.right}" y2="${y}" stroke="#eee9e7" stroke-width="1"/>`;
      volumeAxisMarkup += `<text x="44" y="${y+3}" text-anchor="end" fill="#817a7b" font-size="9" font-family="DM Sans, sans-serif">${compact(volumeValue)}</text>`;
      weightAxisMarkup += `<text x="2" y="${y+3}" text-anchor="start" fill="#817a7b" font-size="9" font-family="DM Sans, sans-serif">${compact(weightValue)}</text>`;
    }
    const slot = plotted.length ? plotW/plotted.length : plotW, barW = Math.min(24, Math.max(9, slot*.52));
    const maxPoints = [];
    plotted.forEach((day, index) => {
      const x = margin.left+index*slot+(slot-barW)/2;
      let y = margin.top+plotH;
      for (const composition of compositions) {
        const segment = day.segments.get(composition);
        if (!segment) continue;
        const segmentHeight = Math.max(.7, (segment.volume/niceMax)*plotH);
        y -= segmentHeight;
        const loads = segment.records.map((row)=>row.weightLabel).join(', ');
        markup += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(.7,segmentHeight-.7).toFixed(1)}" rx="1" fill="${compositionColors.get(composition)}"><title>${escapeHTML(shortDate(day.date))} · ${composition.replace('x','×')}: ${compact(segment.volume)} lb volume · ${loads}</title></rect>`;
      }
      if (day.maxWeight !== null) {
        const weightY = margin.top+plotH-(day.maxWeight/niceWeightMax)*plotH;
        maxPoints.push({ x:x+barW/2, y:weightY, day });
      }
      const labelStep = Math.max(1, Math.ceil(plotted.length/8));
      if (index%labelStep===0 || index===plotted.length-1) markup += `<text x="${(x+barW/2).toFixed(1)}" y="${height-12}" text-anchor="middle" fill="#918a8b" font-size="8" font-family="DM Sans, sans-serif">${day.date.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})}</text>`;
    });
    if (maxPoints.length) {
      const path = maxPoints.map((point,index)=>`${index===0?'M':'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
      markup += `<path d="${path}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#332b2b" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>`;
      maxPoints.forEach(({x,y,day})=>{
        const volume = [...day.segments.values()].reduce((sum,segment)=>sum+segment.volume,0);
        const details = day.records.map((row)=>`${row.weightLabel||'weight not recorded'}${row.setsReps?` · ${row.setsReps}`:''}`).join(' / ');
        const volumeText = volume ? `${compact(volume)} lb` : 'no calculable volume';
        const tooltip = `${shortDate(day.date)} · max weight ${compact(day.maxWeight)} lb · tracked volume ${volumeText} · ${details}`;
        markup += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.7" fill="#c99c4b" stroke="#fff" stroke-width="1.5" tabindex="0" aria-label="${escapeHTML(tooltip)}"><title>${escapeHTML(tooltip)}</title></circle>`;
      });
    }
    if (!plotted.length) markup += `<text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#968f90" font-size="12" font-family="DM Sans, sans-serif">No workout history to chart yet</text>`;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('width',width); svg.setAttribute('height',height); svg.innerHTML=markup;
    const volumeAxis=$('volumeAxis'),weightAxis=$('weightAxis');
    volumeAxis.setAttribute('viewBox','0 0 46 250');volumeAxis.setAttribute('width','46');volumeAxis.setAttribute('height','250');volumeAxis.innerHTML=volumeAxisMarkup;
    weightAxis.setAttribute('viewBox','0 0 46 250');weightAxis.setAttribute('width','46');weightAxis.setAttribute('height','250');weightAxis.innerHTML=weightAxisMarkup;
  }

  function openLift(name) {
    activeLift = name;
    const history = liftHistory(name).sort((a,b)=>a.date-b.date || a.index-b.index);
    const plotted = history.filter((row)=>row.volume!==null);
    const sessionTotals = new Map();
    plotted.forEach((row)=>sessionTotals.set(row.dateKey,(sessionTotals.get(row.dateKey)||0)+row.volume));
    const best = Math.max(0,...sessionTotals.values());
    const sessionCount = new Set(history.map((row)=>row.dateKey)).size;
    const latest = [...history].reverse().find((row)=>row.weight!==null);
    const maxWeight = history.reduce((max,row)=>row.weight===null?max:Math.max(max,row.weight),0);
    $('exerciseTitle').textContent = name;
    $('exerciseSubtitle').textContent = `${sessionCount} recorded ${sessionCount===1?'session':'sessions'} · volume per session`;
    $('bestVolume').textContent = best ? `${compact(best)} lb` : '—';
    $('liftSessions').textContent = sessionCount.toLocaleString();
    $('latestWeight').textContent = latest ? `${compact(latest.weight)} lb` : '—';
    $('maxWeight').textContent = maxWeight ? `${compact(maxWeight)} lb` : '—';
    $('historyCount').textContent = `${history.length} ${history.length===1?'ENTRY':'ENTRIES'}`;
    renderChart(history);
    $('historyRows').innerHTML = [...history].reverse().map((row)=>`<tr><td>${escapeHTML(longDate(row.date))}</td><td>${escapeHTML(row.rawExercise||(row.continued?'↳ continued':'—'))}</td><td>${escapeHTML(row.weightLabel||'—')}</td><td>${escapeHTML(row.setsReps||'—')}</td><td>${row.volume===null?'—':`${compact(row.volume)} lb`}</td></tr>`).join('');
    $('exerciseModal').classList.add('open'); $('exerciseModal').setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden'; $('closeModal').focus();
  }

  function closeLift() { $('exerciseModal').classList.remove('open'); $('exerciseModal').setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function unlock() { sessionStorage.setItem('workout-log-unlocked','1'); $('lockScreen').classList.add('hidden'); $('appShell').classList.add('unlocked'); $('appShell').setAttribute('aria-hidden','false'); }
  if (sessionStorage.getItem('workout-log-unlocked')==='1') unlock();
  $('unlockForm').addEventListener('submit',(event)=>{event.preventDefault();if($('accessCode').value===ACCESS_PASSWORD){$('lockError').textContent='';unlock()}else{$('lockError').textContent='That code did not match. Try again.';$('accessCode').select()}});
  $('togglePassword').addEventListener('click',()=>{const input=$('accessCode'),show=input.type==='password';input.type=show?'text':'password';$('togglePassword').textContent=show?'HIDE':'SHOW';$('togglePassword').setAttribute('aria-label',show?'Hide password':'Show password')});
  $('prevMonth').addEventListener('click',()=>{shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()-1,1);renderCalendar()});
  $('nextMonth').addEventListener('click',()=>{shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,1);renderCalendar()});
  $('todayButton').addEventListener('click',()=>{shownMonth=new Date(today.getFullYear(),today.getMonth(),1);renderCalendar();renderDay(keyFor(today))});
  $('prevYear').addEventListener('click',()=>{annualYear--;renderAnnualOverview()});
  $('nextYear').addEventListener('click',()=>{annualYear++;renderAnnualOverview()});
  $('currentYear').addEventListener('click',()=>{annualYear=today.getFullYear();renderAnnualOverview()});
  $('annualCalendar').addEventListener('click',(event)=>{const button=event.target.closest('[data-annual-date]');if(!button)return;const dateKey=button.dataset.annualDate;const [year,month]=dateKey.split('-').map(Number);shownMonth=new Date(year,month-1,1);setView('calendar');renderDay(dateKey)});
  $('calendarGrid').addEventListener('click',(event)=>{const button=event.target.closest('[data-date]');if(!button)return;const [year,month]=button.dataset.date.split('-').map(Number);if(year!==shownMonth.getFullYear()||month-1!==shownMonth.getMonth()){shownMonth=new Date(year,month-1,1)}renderDay(button.dataset.date)});
  $('dayContent').addEventListener('click',(event)=>{const button=event.target.closest('[data-lift]');if(button)openLift(button.dataset.lift)});
  $('profileButton').addEventListener('click',()=>{const open=$('profileMenu').hidden;$('profileMenu').hidden=!open;$('profileButton').setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('[data-view]').forEach(tab=>tab.addEventListener('click',()=>setView(tab.dataset.view)));
  $('topAvatar').addEventListener('click',()=>setView('stats'));
  $('refreshData').addEventListener('click',refreshFromSheet);
  $('logSearch').addEventListener('input',renderLog);
  $('logSearch').addEventListener('keydown',event=>{if(event.key==='Escape'){$('logSearch').value='';renderLog();}});
  $('logRows').addEventListener('click',event=>{const button=event.target.closest('[data-lift]');if(button)openLift(button.dataset.lift)});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&activeView==='log'){event.preventDefault();$('logSearch').focus();}});
  $('profileMenu').addEventListener('click',(event)=>{const option=event.target.closest('[data-profile]');if(option)changeProfile(option.dataset.profile)});
  document.addEventListener('click',(event)=>{if(!$('profileControl').contains(event.target))closeProfileMenu()});
  $('closeModal').addEventListener('click',closeLift);
  $('exerciseModal').addEventListener('click',(event)=>{if(event.target===$('exerciseModal'))closeLift()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){if($('exerciseModal').classList.contains('open'))closeLift();closeProfileMenu()}});
  updateProfileLabels();
  renderCalendar();
})();
