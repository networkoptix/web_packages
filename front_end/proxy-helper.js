const { readFileSync, writeFileSync } = require('fs');
const { URL } = require('url');

const checkUrl = s => {
    if (!s.startsWith('http')) {
        s = `https://${s}`;
    }

    try {
        const url = new URL(s);
        return url.href.replace(/\/$/, '');
    } catch (err) {}
};

const dynamicInstanceProxy = target => new Proxy(
    target,
    {
        get(target, prop, receiver) {
            console.log(`Target from environment: ${prop}`);
            const foundInLookup = target[prop];
            if (foundInLookup) {
                console.log(`Instance url found in lookup: ${foundInLookup}`);
                return foundInLookup;
            }

            const dynamicInstanceUrl = checkUrl(prop);
            if (dynamicInstanceUrl) {
                console.log(`Instance url found from TARGET env variable: ${dynamicInstanceUrl}`);
                return dynamicInstanceUrl;
            }

            throw new Error(`Not a valid target or url: ${prop}`);
        },
    }
);

const legacyTargetConfigs = {
    prod: 'https://nxvms.com',
    stage: 'https://stage.nxvms.com'
};

const proxyTargetConfig = dynamicInstanceProxy({
    qa: 'https://qa.cloud.hdw.mx',
    regress: 'https://regress.cloud.hdw.mx',
    dev2: 'https://dev2.cloud.hdw.mx',
    dev3: 'https://dev3.cloud.hdw.mx',
    local: 'http://localhost:8000',
    meta: 'https://meta.nxvms.com',
    'cloud-test': 'https://cloud-test.hdw.mx',
    ...legacyTargetConfigs
});

const target = process.env.CLOUD_TARGET || 'cloud-test';
const targetInstanceUrl = proxyTargetConfig[target];
const rewriteLegacy = Object.values(legacyTargetConfigs).includes(targetInstanceUrl);

const replaceCloudHost = (templatePath, targetPath) => writeFileSync(targetPath, readFileSync(templatePath, 'utf8').replace('$TARGET_INSTANCE_URL', targetInstanceUrl.split('//').pop().replace('/', '')));

replaceCloudHost('./common/environments/environment.template.ts', './common/environments/environment.dev.ts');
replaceCloudHost('./common/environments/environment.local.template.ts', './common/environments/environment.local.ts');

module.exports = {
    dynamicInstanceProxy,
    proxyTargetConfig,
    rewriteLegacy,
    targetInstanceUrl,
    replaceCloudHost
};
