import { v4 as uuid } from 'uuid';

import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';

import { createNewLayoutFactory } from './create-new-layout-factory';
import { generateLayoutItems } from './mocks/layout-item-mocks';

describe('createNewLayoutFactory', () => {
    const defaultName = staticLang.layouts.helpMessages.unsaved.title;
    const parentId = uuid();
    const customParentId = uuid();
    const customName = uuid();
    const systemId = uuid();
    const customItems = [...generateLayoutItems(5)];

    const defaultLayout = {
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.01,
        fixedHeight: 0,
        fixedWidth: 0,
        id: null,
        logicalId: 0,
        items: [],
        name: defaultName,
        locked: true,
        systemId,
        parentId,
    };

    const getAccountId = jest.fn().mockReturnValue(parentId);
    const createNewLayout = createNewLayoutFactory(getAccountId);

    it('should create a new layout', () => {
        const layout = createNewLayout(systemId);

        expect(layout).toEqual(defaultLayout);
    });

    it('should create a new layout with custom parentId', () => {
        const layout = createNewLayout(systemId, customParentId);

        expect(layout).toEqual({
            ...defaultLayout,
            parentId: customParentId,
        });
    });

    it('should create a new layout with custom name', () => {
        const layout = createNewLayout(systemId, parentId, customName);

        expect(layout).toEqual({
            ...defaultLayout,
            name: customName,
        });
    });

    it('should create a new layout with custom items', () => {
        const layout = createNewLayout(systemId, parentId, defaultName, customItems);

        expect(layout).toEqual({
            ...defaultLayout,
            items: customItems,
        });
    });

    it('should be locked if not editable', () => {
        nxConfig.featureFlags.layoutsEditable = false;
        const layout = createNewLayout(systemId, parentId, defaultName, customItems);

        expect(layout.locked).toBe(true);
    });

    it('should not be locked if editable', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        const layout = createNewLayout(systemId, parentId, defaultName, customItems);

        expect(layout.locked).toBe(false);
    });
});
