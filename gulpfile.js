// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const gulp = require('gulp');
const cp = require('child_process');
const path = require('path');
const serverDir = path.join(__dirname, 'jdtls.ext');

gulp.task('build-plugin', (done) => {
  cp.execSync(`${mvnw()} clean package`, { cwd: serverDir, stdio: [0, 1, 2] });
  done();
});

function isWin() {
  return /^win/.test(process.platform);
}

function mvnw() {
  return isWin() ? 'mvnw.cmd' : './mvnw';
}
