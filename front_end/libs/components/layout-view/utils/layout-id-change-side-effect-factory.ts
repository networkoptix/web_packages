import staticLang from '@language_static';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';

export const layoutIdChangeSideEffectFactory =
    (
        paramState$$: LayoutStateService['paramStateHandler']['state$$'],
        systemName: string,
        setPageTitle: NxPageService['pageTitle'],
    ) =>
    (layoutId: string) => {
        if (layoutId) {
            paramState$$.set({
                params: { layoutId },
            });
        }

        setPageTitle([staticLang.pageTitles.layouts, systemName, nxConfig.cloudName].join(' - '));

        return layoutId;
    };
