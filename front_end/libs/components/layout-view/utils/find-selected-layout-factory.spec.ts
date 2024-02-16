import { sample } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { Layout } from '@services/system-api.types/layouts.types';
import type { NxSystem } from '@services/system.service/system';
import { SystemResourcesTypeMap } from '@store/system-resources/system-resources.types';

import type { createFocusLayoutFactory } from './create-focus-layout-factory';
import { createNewLayoutFactory } from './create-new-layout-factory';
import { findSelectedLayoutFactory } from './find-selected-layout-factory';

const createMockSystem = (partialSystem: Partial<NxSystem> = {}): NxSystem =>
    ({
        ...partialSystem,
    }) as NxSystem;

describe('findSelectedLayoutFactory', () => {
    const createNewLayoutMock = jest.fn<
        Layout,
        Parameters<ReturnType<typeof createNewLayoutFactory>>
    >();
    const createFocusLayoutMock = jest.fn<
        Promise<Layout>,
        Parameters<ReturnType<typeof createFocusLayoutFactory>>
    >();
    const systemId = uuid();

    const createLayout = (layoutId: string): Layout => {
        const layout = createNewLayoutFactory(() => uuid())(systemId);
        layout.id = layoutId;
        return layout;
    };

    function* generateLayouts(count: number): Generator<Layout, void, unknown> {
        for (let i = 0; i < count; i++) {
            yield createLayout(uuid());
        }
    }

    const mockSystem = createMockSystem({ id: systemId, useRest: true });

    const findSelectedLayout = findSelectedLayoutFactory(
        createNewLayoutMock,
        createFocusLayoutMock,
    );

    it('should find correct existingLayout', async () => {
        const layouts = [...generateLayouts(5)];
        const expectedLayout = sample(layouts);
        expect(
            await findSelectedLayout([
                mockSystem,
                expectedLayout.id,
                layouts,
                {} as SystemResourcesTypeMap,
            ]),
        ).toEqual(expectedLayout);
    });

    it('should create new layout if layoutId is not found', async () => {
        const newLayout = createLayout(uuid());
        createNewLayoutMock.mockReturnValue(newLayout);
        createFocusLayoutMock.mockReturnValue(Promise.reject());
        expect(
            await findSelectedLayout([mockSystem, uuid(), [], {} as SystemResourcesTypeMap]),
        ).toEqual(newLayout);
    });

    it('should create focus layout if createFocusLayout finds match', async () => {
        const newLayout = createLayout(uuid());
        createFocusLayoutMock.mockReturnValue(Promise.resolve(newLayout));
        expect(
            await findSelectedLayout([mockSystem, newLayout.id, [], {} as SystemResourcesTypeMap]),
        ).toEqual(newLayout);
        expect(createFocusLayoutMock).toBeCalledWith(systemId, newLayout.id);
    });
});
