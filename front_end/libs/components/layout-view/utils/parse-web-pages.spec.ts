import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import { WebPages, WebPage } from '@services/system-api.types/layouts.types';

import { ResourceLookup } from './layout-view-utils.types';
import { generateWebPages } from './mocks/webpages-mocks';
import { parseWebPages } from './parse-web-pages';

describe('parseWebPages', () => {
    it('should parse web pages correctly', () => {
        const webPages: WebPages = [...generateWebPages(5)];

        const aspectRatio = 16 / 9;
        const type = ResourceType.WEB_PAGE;

        const expected: ResourceLookup<WebPage> = webPages.reduce(
            (webPages, webPage) => ({
                ...webPages,
                [webPage.id]: {
                    id: webPage.id,
                    type,
                    name: webPage.name,
                    details: webPage,
                    aspectRatio,
                } as ResourceNode<WebPage>,
            }),
            {} as ResourceLookup<WebPage>,
        );

        const result = parseWebPages(webPages, aspectRatio);

        expect(result).toEqual(expected);
    });
});
