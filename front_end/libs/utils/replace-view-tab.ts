import { nxConfig } from '@services/nx-config/config';

import { canViewLayouts } from './can-view-layouts';

/**
 * Check if view tab should be replaced with layouts
 */
export function replaceViewTab(buildOrWithBuild: Parameters<typeof canViewLayouts>[0]): boolean {
    const { layoutsTimeline, layoutsTimelineSaas, layoutsReplaceViewTab } = nxConfig.featureFlags;
    return Boolean(
        canViewLayouts(buildOrWithBuild) &&
            layoutsReplaceViewTab &&
            (layoutsTimeline || layoutsTimelineSaas),
    );
}
