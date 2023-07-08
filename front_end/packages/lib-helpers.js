const { readdirSync, statSync, readFile } = require('fs');

const getAllPackageDirs = (dirPath = __dirname, baseDirs = []) => {
    readdirSync(dirPath).forEach(file => {
        let isDirectory = false;
        try {
            isDirectory = statSync(`${dirPath}/${file}`).isDirectory();
        } catch (e) {
            return baseDirs;
        }
        if (file !== 'node_modules' && isDirectory) {
            baseDirs = getAllPackageDirs(dirPath + '/' + file, baseDirs);
        } else if (file === 'package.json') {
            baseDirs.push(dirPath);
        }
    });

    return baseDirs;
};

const loadFile = path =>
    new Promise((resolve, reject) => {
        readFile(path, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });

const getIndicator = (length = 0) =>
    setInterval(() => {
        length++;
        process.stdout.write('-');
        if (length > 50) {
            length = 0;
            process.stdout.write('\r\x1b[K');
        }
    }, 100);

module.exports = { getAllPackageDirs, loadFile, getIndicator };
