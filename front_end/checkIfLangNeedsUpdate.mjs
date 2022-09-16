import globHash from 'glob-hash';
import fs from 'fs';

const hashFile = 'language_hash'

const include = [
    "./src/**/*.html",
    "./src/language_i18n_static.json",
    "./src/customization/*.json",
    "../cloud/cms/menus.json"
]

console.log("Comparing hash for the following globs: \n")

console.log(JSON.stringify(include, null, 4) + '\n')

const currentHash = fs.readFileSync(hashFile, 'utf8');

console.log(`Current Language Hash: ${currentHash} \n`)

globHash({
    include
})
    .then( (hash) => {
        if (hash === currentHash) {
            console.log('Hash is unchanged. Skipping language scripts.')
            process.exitCode = 1
        } else {
            console.log('Hash has changed. Updating hash and running language scripts')
            fs.writeFileSync(hashFile, hash)
        }
    }, function (error) {
        console.log('Some Error Has Occured \n')
        console.error(error);
    });