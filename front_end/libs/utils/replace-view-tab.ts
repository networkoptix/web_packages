import { nxConfig } from '@services/nx-config/config';

import { canViewLayouts } from './can-view-layouts';

/**
 * Check if view tab should be replaced with layouts
 */
export function replaceViewTab(versionOrWithVersion: number | { version: number }): boolean {
    const { layoutsTimeline, layoutsTimelineSaas, layoutsReplaceViewTab } = nxConfig.featureFlags;
    return (
        canViewLayouts(versionOrWithVersion, 6) &&
        layoutsReplaceViewTab &&
        (layoutsTimeline || layoutsTimelineSaas)
    );
}
