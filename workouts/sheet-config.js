// Set this to the Google Sheets “Publish to web” CSV link for the workout sheet.
// This URL is public by design; do not put passwords or API keys here.
(function (root) {
  const config = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhZSBA22tX2eKgnKmm5a_fsGOM8X4JD1FZe9EYMqmMrJuy_LC-kvzmZxBCK2QtqwA5UOnr_x53wID1/pub?gid=707518988&single=true&output=csv'
  };
  root.WORKOUTS_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
})(typeof window !== 'undefined' ? window : globalThis);
