function isWin() {
    return /^win/.test(process.platform);
}

function mvnw() {
    return isWin() ? 'mvnw.cmd' : './mvnw';
}

const cp = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, '..', 'jdtls.ext');

cp.execSync(`${mvnw()} clean package`, { cwd: serverDir, stdio: [0, 1, 2] });