import fs from 'fs';

import globHash from 'glob-hash';

const hashFile = 'language_hash';

const update = process.argv.pop() === 'update';

const include = [
    '**/*.component.html',
    './common/language/language_*.json',
    './common/customization/menus.json',
    './common/language/language_i18n_static_types.ts',
    '../cloud/cms/menus.json'
];

console.log('Comparing hash for the following globs: \n');

console.log(JSON.stringify(include, null, 4) + '\n');
let currentHash = '';
if (fs.existsSync(hashFile)) {
    currentHash = fs.readFileSync(hashFile, 'utf8');
}

console.log(`Current Language Hash: ${currentHash} \n`);

globHash({
    include
})
    .then(hash => {
        if (hash === currentHash) {
            console.log('Hash is unchanged. Skipping language scripts.');
            process.exitCode = 1;
        } else if (update) {
            console.log('Hash has changed. Updating hash');
            fs.writeFileSync(hashFile, hash);
        }
    }, function (error) {
        console.log('Some Error Has Occured \n');
        console.error(error);
    });
