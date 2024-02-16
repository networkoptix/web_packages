import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { Layout, LayoutItem } from '@services/system-api.types/layouts.types';

export const createNewLayoutFactory =
    (getAccountId: () => string) =>
    (
        systemId: string,
        parentId = '',
        name = staticLang.layouts.helpMessages.unsaved.title,
        items: LayoutItem[] = [],
    ): Layout => ({
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.01,
        fixedHeight: 0,
        fixedWidth: 0,
        id: null,
        items,
        locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
        logicalId: 0,
        name,
        systemId,
        parentId: parentId || getAccountId(),
    });
