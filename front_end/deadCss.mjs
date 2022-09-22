import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

function getFilesizeInKiloBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size / 1024;
    return fileSizeInBytes.toFixed(2);
}

function getFilesFromPath(dir, extension) {
    const files = fs.readdirSync(dir);
    return files.filter(e => path.extname(e).toLowerCase() === extension);
}

// find the styles css file
const files = getFilesFromPath('./dist', '.css');
const data = [];

if (!files && files.length <= 0) {
    console.log('cannot find style files to purge');
    // return;
}

for (const f of files) {
    // get original file size
    const originalSize = getFilesizeInKiloBytes('./dist/' + f) + 'kb';
    const o = { file: f, originalSize, newSize: '' };
    data.push(o);
}

console.log('Run PurgeCSS...');

childProcess.exec('purgecss -css dist/*.css --content dist/index.html dist/*.js -o dist/', function (_error, stdout, stderr) {
    console.log('PurgeCSS done');
    console.log();

    for (const d of data) {
    // get new file size
        const newSize = getFilesizeInKiloBytes('./dist/' + d.file) + 'kb';
        d.newSize = newSize;
    }

    console.table(data);
});
