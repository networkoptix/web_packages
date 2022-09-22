#!/usr/bin/env node
'use strict';

const { exec } = require('child_process');

const { getAllPackageDirs, loadFile, getIndicator } = require('./lib-helpers');

async function main() {
    const processes = {};
    console.log('Publishing public libraries');
    const indicator = getIndicator();

    for (const dir of getAllPackageDirs()) {
        const folder = dir.split('/').reverse()[0];
        console.log(`Checking if ${folder} is public`);
        const packageJson = JSON.parse(await loadFile(`${dir}/package.json`));
        if (packageJson.private) {
            console.log(`Skipping ${packageJson.name}, this is a private package, please set private to false if you want to publish this`);
        } else {
            console.log(`Publishing ${packageJson.name}@${packageJson.version} from ${dir} to NPM`);
            const child = exec('npm publish', { cwd: dir }, (err, _, stderr) => {
                if (err) {
                    process.exitCode = 1;
                    console.error(stderr);
                    console.error(`\nFailed to publish ${packageJson.name}@${packageJson.version}. Check logged error for cause.`);
                }
            });
            child.on('exit', code => {
                process.exitCode = code || process.exitCode;
                delete processes[dir];
                console.log(`\nFinished linking ${folder}\n`);
                if (!Object.keys(processes).length) {
                    if (!process.exitCode) {
                        console.log('\nDone linking local dependencies');
                    }
                    clearInterval(indicator);
                }
            });
            processes[dir] = child;
        }
    }
}

main();
