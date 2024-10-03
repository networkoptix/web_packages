import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

import { globby } from 'globby';
import { sortBy } from 'lodash-es';

/** Pack files into bins.
 *
 * https://en.wikipedia.org/wiki/Bin_packing_problem
 *
 * @param {string[]} files File paths
 * @param {number} binSize Max number of lines
 * @returns {string[][]} Bins
 */
export function binFiles(files, binSize) {
    /** @type {Map<string, number>} */
    const lineCounts = new Map();
    for (const file of files) {
        const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n').length + 1;
        lineCounts.set(file, lines);
    }

    class Bin {
        constructor() {
            this.remainingSpace = binSize;
            /** @type {string[]} */
            this.files = [];
        }

        /**
         *
         * @param {number} fileSize
         * @returns {boolean}
         */
        canFit(fileSize) {
            return this.remainingSpace >= fileSize;
        }

        /**
         *
         * @param {string} file
         * @param {number} size
         * @returns {void}
         */
        addFile(file, size) {
            this.files.push(file);
            this.remainingSpace -= size;
        }
    }

    // FFD: https://en.wikipedia.org/wiki/First-fit-decreasing_bin_packing
    const sortedFiles = sortBy(files, [f => -lineCounts.get(f)]);
    const bins = [new Bin()];
    for (const file of sortedFiles) {
        const lines = lineCounts.get(file);
        const canFitBin = bins.find(b => b.canFit(lines));
        if (canFitBin) {
            canFitBin.addFile(file, lines);
        } else {
            const newFfdBin = new Bin();
            newFfdBin.addFile(file, lines);
            bins.push(newFfdBin);
        }
    }

    const binnedFiles = bins.map(b => b.files);
    return binnedFiles;
}

/**
 * @typedef {Object} Options
 * @property {string[]} [globPatterns] Patterns to match, defaults to .esprint paths
 * @property {number} [binSize] Max lines per bin, defaults to 50000
 */

/** Lint codebase in chunks.
 *
 * This is necessary because the system pipe buffer can't hold the entire ESLint
 * output in the buffer at once.
 *
 * @param {string} blacklistFile Blacklist file name (extension included)
 * @param {Options} [options]
 * @returns {Promise<Record<string, string[]>>} File path key, issue lines value
 */
export async function binnedLint(blacklistFile, options = {}) {
    // cwd should be front_end when called
    const esprintrc = fs.readFileSync('.esprintrc', { encoding: 'utf-8' });
    const blacklistOriginal = fs.readFileSync(`linting/${blacklistFile}`, { encoding: 'utf-8' });
    const { globPatterns = JSON.parse(esprintrc).paths, binSize = 50000 } = options;
    return globby(globPatterns, { gitignore: true, ignoreFiles: '.eslintignore' })
        .then(files => binFiles(files, binSize))
        .then(bins => {
            fs.writeFileSync(`./linting/${blacklistFile}`, 'module.exports = [];');
            /** @type {Awaited<ReturnType<binnedLint>>} */
            const issues = {};
            for (const bin of bins) {
                fs.writeFileSync('.esprintrc', JSON.stringify({ paths: bin }));
                try {
                    childProcess.execSync(
                        'export NX_TASK_TARGET_TARGET=lint; npx esprint check --workers=4',
                        { encoding: 'utf-8' },
                    );
                } catch (error) {
                    /** @type {string} */
                    const stdOut = error.stdout;

                    if (!/✖ \d+ problems \(\d+ errors, \d+ warnings\)\s*$/.test(stdOut)) {
                        fs.writeFileSync(`./linting/${blacklistFile}`, blacklistOriginal);
                        throw Error('✖ Output cut off, decrease bin size');
                    }

                    /** @type {string} */
                    let currentFile;
                    for (const line of stdOut.split('\n')) {
                        if (fs.existsSync(line)) {
                            currentFile = path.relative(process.cwd(), line);
                            issues[currentFile] = [];
                        } else if (/^\s+\d+:\d+/.test(line)) {
                            //   230:22  [error|warn] [Message]
                            issues[currentFile].push(line);
                        }
                    }
                }
            }
            const sortedIssues = Object.fromEntries(
                Object.keys(issues)
                    .sort()
                    .map(k => [k, issues[k]]),
            );
            return sortedIssues;
        })
        .finally(() => {
            fs.writeFileSync('.esprintrc', esprintrc);
        });
}
