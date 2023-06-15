/* A script to limit esprint, which by default assigns one worker to every
CPU thread, each of which consumes a little over 1GB of RAM. */
const os = require('os');

const availableMemGb = os.freemem() / (1024 ** 3);
if (availableMemGb <= 2.4) {
    console.error('At least 2.4GB of free RAM required. Running single threaded.');
}
const memLimit = Math.floor(availableMemGb / 1.2);
// Include extra 0.2GB buffer per worker

const threads = os.cpus().length;
if (threads < 4) {
    // Just in case somebody tries running this on a 2T processor
    console.error('At least 4 CPU threads required. Running single threaded.');
}

// Assuming HT and homogenous CPU, use all physical cores
// There doesn't appear to be a way to distinguish heterogenous CPU cores atm
const threadLimit = Math.floor(threads / 2);

const workers = Math.min(memLimit, threadLimit);
const limit = memLimit >= threadLimit ? 'CPU' : 'RAM';
// eslint-disable-next-line no-console
console.log(`Running esprint with ${workers} workers (${limit} limited)`);
process.exitCode = workers;
