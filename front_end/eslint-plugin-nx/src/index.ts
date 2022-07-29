/* Resources
https://astexplorer.net/
https://eslint.org/docs/latest/developer-guide/working-with-rules
https://typescript-eslint.io/docs/development/custom-rules/
*/

import fs from 'fs';
import path from 'path';

export = {
    rules: fs.readdirSync(path.join(__dirname, 'rules'))
        .reduce<Record<string, unknown>>((rules, file) => {
            if (file === 'utils.js') {
                return rules;
            }
            const { name } = path.parse(file);
            rules[name] = require(`./rules/${name}`);
            return rules;
        }, {})
        // Avoids having to manually import+list rules
        // Works by passing through TS compilation unchanged
};
