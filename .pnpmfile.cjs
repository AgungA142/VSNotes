// Skip native compilation untuk package yang hanya dibutuhkan desktop app
// better-sqlite3 dan electron tidak perlu di-compile di server Railway
function readPackage(pkg) {
  if (['better-sqlite3', 'electron', 'electron-builder'].includes(pkg.name)) {
    pkg.scripts = {};
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
