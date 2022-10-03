/* A script to limit esprint, which by default assigns one worker to every
CPU thread, each of which consumes a little over 1GB of RAM. */
const childProcess = require('child_process');
const os = require('os');

const availableMemGb = os.freemem() / (1024 ** 3);
if (availableMemGb <= 2.4) {
    throw new Error('At least 2.4GB of free RAM required');
}
const memLimit = Math.floor(availableMemGb / 1.2);
// Include extra 0.2GB buffer per worker

const threads = os.cpus().length;
if (threads < 4) {
    throw new Error('At least 4 CPU threads required');
}
// Just in case somebody tries running this on a 2T processor
const threadLimit = Math.floor(threads / 2);

const workers = Math.min(memLimit, threadLimit);
const limit = memLimit >= threadLimit ? 'CPU' : 'RAM';
console.log(`Running esprint with ${workers} workers (${limit} limited)`);
childProcess.execSync(`esprint check --fix --workers=${workers}`);
