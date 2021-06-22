const sass = require('sass');
const fs = require('fs');
const path = require('path');

const dest = path.resolve(__dirname, 'static/styles');
const skinPath = path.resolve(__dirname, '../skins');

const buildSkin = (color) => {
    const source = path.resolve(skinPath, color, 'front_end/styles/_custom_palette.scss');

    const skin = sass.renderSync({ file: source });
    fs.writeFileSync(path.resolve(dest, `${color}.css`), skin.css.toString(), { flag: 'a+' });
    // Blue will be the default skin
    if (color === 'blue') {
        fs.writeFileSync(path.resolve(dest, 'skin.css'), skin.css.toString(), { flag: 'a+' });
    }
};

const scanSkins = () => {
    const skins = fs.readdirSync(skinPath);
    skins.forEach((color) => buildSkin(color));
};

scanSkins();
