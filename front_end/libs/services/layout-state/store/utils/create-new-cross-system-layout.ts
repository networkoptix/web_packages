import staticLang from '@language_static';
import { LayoutItem } from '@services/system-api.types';
import { dirtyId } from '@utils/general';

import { LayoutTypes, UnsavedLayoutState, UnsavedState } from '../shared/types/layout-state.types';
import { hashItem } from '../shared/utils';

export const createNewUnsavedCrossSystemLayout = (
    id: string,
    name: string,
    items: LayoutItem[],
): UnsavedLayoutState => {
    id = dirtyId(id);
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
        locked: false,
        logicalId: 0,
        name: name || staticLang.layouts.helpMessages.unsaved.title,
        systemId: '',
    };

    return {
        id,
        layoutType: LayoutTypes.CROSS_SYSTEM,
        unsaved: UnsavedState.UNSAVED,
        layout,
        baseVersion: hashItem(layout),
    };
};
