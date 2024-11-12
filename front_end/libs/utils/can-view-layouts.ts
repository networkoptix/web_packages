import { compare, validate } from 'compare-versions';

import { nxConfig } from '@services/nx-config/config';

export function canViewLayouts(buildOrWithBuild: string | { build: string }): boolean {
    const build = typeof buildOrWithBuild === 'string' ? buildOrWithBuild : buildOrWithBuild.build;

    const minBuild = nxConfig.featureFlags.layouts51Enabled ? '5.1' : '6.0.1';

    const enabledForBrowser =
        nxConfig.featureFlags.layoutsNonChrome ||
        // @ts-expect-error chrome property only exist on chromium browsers
        !!window.chrome;

    const enabledForVersion = validate(build) && compare(build, minBuild, '>=');

    return !!nxConfig.featureFlags.layouts && enabledForBrowser && enabledForVersion;
}
