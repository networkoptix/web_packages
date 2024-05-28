import { nxConfig } from '@services/nx-config/config';

export function canViewLayouts(versionOrWithVersion: number | { version: number }): boolean {
    const version =
        typeof versionOrWithVersion === 'number'
            ? versionOrWithVersion
            : versionOrWithVersion.version;

    const minVersion = nxConfig.featureFlags.layouts51Enabled ? (5.1 as const) : (6 as const);

    const enabledForBrowser =
        nxConfig.featureFlags.layoutsNonChrome ||
        // @ts-expect-error chrome property only exist on chromium browsers
        !!window.chrome;

    const enabledForVersion = version >= minVersion;

    return !!nxConfig.featureFlags.layouts && enabledForBrowser && enabledForVersion;
}
