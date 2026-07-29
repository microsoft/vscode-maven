function isWin() {
    return /^win/.test(process.platform);
}

function mvnw() {
    return isWin() ? 'mvnw.cmd' : './mvnw';
}

const cp = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, '..', 'jdtls.ext');

// `eclipse.p2.mirrors=false` stops p2 from following download.eclipse.org's mirror
// redirect, which hands out a different third party host per request and makes the
// set of addresses the build contacts impossible to express as an allow list.
cp.execSync(`${mvnw()} clean package -Declipse.p2.mirrors=false`, { cwd: serverDir, stdio: [0, 1, 2] });