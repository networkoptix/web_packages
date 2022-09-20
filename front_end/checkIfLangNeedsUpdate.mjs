import globHash from 'glob-hash';
import fs from 'fs';

const hashFile = 'language_hash'

const update = process.argv.pop() === 'update'

const include = [
    "./src/**/*.component.html",
    "./src/language_i18n*.json",
    "./src/customization/menus.json",
    "./src/language_i18n_static_types.ts",
    "../cloud/cms/menus.json"
]

console.log("Comparing hash for the following globs: \n")

console.log(JSON.stringify(include, null, 4) + '\n')

const currentHash = fs.readFileSync(hashFile, 'utf8');

console.log(`Current Language Hash: ${currentHash} \n`)

globHash({
    include
})
    .then((hash) => {
        if (hash === currentHash) {
            console.log('Hash is unchanged. Skipping language scripts.')
            process.exitCode = 1
        } else if (update) {
            console.log('Hash has changed. Updating hash')
            fs.writeFileSync(hashFile, hash)
        }
    }, function (error) {
        console.log('Some Error Has Occured \n')
        console.error(error);
    });