import { inject } from '@angular/core';

import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { nxConfig } from '@services/nx-config/config';
import { Layout, LayoutItem } from '@services/system-api.types';
import { NxSystemService } from '@services/system.service/system.service';
import { dirtyId } from '@utils/general';

import { LayoutTypes, UnsavedLayoutState, UnsavedState } from '../shared/types/layout-state.types';
import { hashItem } from '../shared/utils';

export const createNewUnsavedLocalLayout = (
    id: string,
    name: string,
    items: LayoutItem[],
): UnsavedLayoutState => {
    id = dirtyId(id);
    const system = inject(NxSystemService).getCurrentSystem();
    const layout = {
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.01,
        fixedHeight: 0,
        fixedWidth: 0,
        id,
        items: items || [],
        locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
        logicalId: 0,
        name: name || staticLang.layouts.helpMessages.unsaved.title,
        systemId: system.id,
        parentId: inject(NxAccountService).account.id || system.permissionManager.currentUser().id,
    };

    return {
        id,
        layoutType: LayoutTypes.LOCAL,
        unsaved: UnsavedState.UNSAVED,
        layout,
        baseVersion: hashItem(layout),
    };
};

export const createNewUnsavedLocalLayoutDuplicate = (
    id: string,
    layout: Layout,
): UnsavedLayoutState => {
    id = dirtyId(id);
    const system = inject(NxSystemService).getCurrentSystem();
    layout = {
        ...layout,
        id,
        locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
        parentId: inject(NxAccountService).account.id || system.permissionManager.currentUser().id,
    };
    return {
        id,
        layoutType: LayoutTypes.LOCAL,
        unsaved: UnsavedState.UNSAVED,
        layout,
        baseVersion: hashItem(layout),
    };
};
