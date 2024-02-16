import { sample } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { LayoutResourceTree, ResourceType } from '@components/layout-grid/layout-grid.types';
import { Account } from '@services/account.service/account';
import { Layout } from '@services/system-api.types/layouts.types';
import { dirtyId } from '@utils/general';

import { createFocusLayoutFactory } from './create-focus-layout-factory';
import { generateAccount } from './mocks/account-mocks';
import { generateServers } from './mocks/servers-mocks';

describe('createFocusLayoutFactory', () => {
    const resourceTreeItems = [...generateServers(5)];
    const target = sample(resourceTreeItems);

    const layoutItemLookup$ = new BehaviorSubject(
        resourceTreeItems.reduce(
            (acc, server) => ({
                ...acc,
                [dirtyId(server.id)]: {
                    children: [],
                    name: server.name,
                    type: ResourceType.SERVER,
                    details: server,
                },
            }),
            {} as LayoutResourceTree,
        ),
    );

    const selectedLayout$ = new BehaviorSubject({} as Layout);
    const focusViewToken = uuid();
    const account: Account = generateAccount();
    const systemId = uuid();

    const createFocusLayout = createFocusLayoutFactory({
        layoutItemLookup$: layoutItemLookup$ as Observable<LayoutResourceTree>,
        focusViewToken,
        selectedLayout$,
        account,
    });

    it('should create focus layout', async () => {
        const layout = await createFocusLayout(systemId, target.id);
        expect(layout.id).toBe(target.id);
        expect(layout.items.length).toBe(1);
        expect(layout.items[0].id).toBe(dirtyId(target.id));
        expect(layout.name).toBe(focusViewToken);
    });
});
