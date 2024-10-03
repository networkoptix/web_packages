import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import { WebPage, WebPages } from '@services/system-api.types/layouts.types';

import { ResourceLookup } from './layout-view-utils.types';

export const parseWebPages = (
    webPages: WebPages,
    aspectRatio: number,
): ResourceLookup<(typeof webPages)[0]> =>
    webPages.reduce(
        (webPages, webPage) => ({
            ...webPages,
            [webPage.id]: {
                id: webPage.id,
                type: ResourceType.WEB_PAGE,
                name: webPage.name,
                details: webPage,
                aspectRatio,
            } as ResourceNode<WebPage>,
        }),
        {} as ResourceLookup<(typeof webPages)[0]>,
    );
