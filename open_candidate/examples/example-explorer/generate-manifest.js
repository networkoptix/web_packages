// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import * as fs from 'fs'

const baseDir = './public'

const packages = fs.readdirSync(baseDir).map(packageDir => {
    try {
        const packageJson = fs.readFileSync(`${baseDir}/${packageDir}/package.json`).toString()
        const { name, description, includeInDemo } = JSON.parse(packageJson)
        return includeInDemo && { name, description, packageDir }
    } catch(e) {
        return null
    }
}).filter(include => !!include).sort((a, b) => a.name.localeCompare(b.name))

fs.writeFileSync(`./src/manifest.json`, JSON.stringify(packages, null, 4))