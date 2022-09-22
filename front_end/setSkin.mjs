import path from 'path';
import { fileURLToPath } from 'url';

import fsmv from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copySkin = color => {
    let source = path.resolve(__dirname, '../skins', color, 'front_end/styles');
    let dest = path.resolve(__dirname, 'common/styles/custom');
    fsmv.copy(source, dest, { mkdirp: true }, error => error ? console.log(error) : null);

    const inlineWizardDest = path.resolve(__dirname, 'inline-wizard/customization/custom');
    fsmv.copy(source, inlineWizardDest, { mkdirp: true }, error => error ? console.log(error) : null);

    source = path.resolve(__dirname, '../skins', color, 'front_end/images');
    dest = path.resolve(__dirname, 'common/images');
    fsmv.copy(source, dest, { mkdirp: true }, error => error ? console.log(error) : null);
};

copySkin(process.argv[3] || 'blue');
