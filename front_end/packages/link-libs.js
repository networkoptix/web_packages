#!/usr/bin/env node
'use strict';

const { exec } = require('child_process');

const { getAllPackageDirs, getIndicator } = require('./lib-helpers');

console.log(`Linking common packages in ${__dirname}`);

const processes = {};

const indicator = getIndicator();

for (const dir of getAllPackageDirs()) {
    const folder = dir.split('/').reverse()[0];
    console.log(`\nLinking ${folder}\n`);
    const child = exec('npm link', { cwd: dir }, (err, _, stderr) => {
        if (err) {
            process.exitCode = 1;
            console.error(stderr);
        }
    });
    child.on('exit', code => {
        delete processes[dir];
        process.exitCode = code || process.exitCode;
        console.log(`\nFinished linking ${folder}\n`);
        if (!Object.keys(processes).length) {
            clearInterval(indicator);
            if (!process.exitCode) {
                console.log('\nDone linking local dependencies');
            }
        }
    });
    processes[dir] = child;
};
