import { v4 as uuid } from 'uuid';

import { WebPage } from '@services/system-api.types/layouts.types';

const generateWebPage = (): WebPage => ({
    id: uuid(),
    name: uuid(),
    url: uuid(),
    typeId: uuid(),
    parentId: uuid(),
});
export function* generateWebPages(count: number): Generator<WebPage, void, unknown> {
    for (let i = 0; i < count; i++) {
        yield generateWebPage();
    }
}
