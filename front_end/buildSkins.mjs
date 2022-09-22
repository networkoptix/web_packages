import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import sass from 'sass';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dest = path.resolve(__dirname, process.argv[2] || 'static/styles');
const skinPath = path.resolve(__dirname, '../skins');

const buildSkin = color => {
    const source = path.resolve(skinPath, color, 'front_end/styles/_custom_palette.scss');

    const skin = sass.renderSync({ file: source });
    fs.writeFileSync(path.resolve(dest, `${color}.css`), skin.css.toString(), { flag: 'w' });
    // Blue will be the default skin
    if (color === 'blue') {
        fs.writeFileSync(path.resolve(dest, 'skin.css'), skin.css.toString(), { flag: 'w' });
    }
};

const scanSkins = () => {
    const skins = fs.readdirSync(skinPath);
    skins.forEach(color => buildSkin(color));
};

scanSkins();
