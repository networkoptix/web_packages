import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { cleanIdLegacy } from '@utils/general';

export const defaultLayoutSelectorFactory =
    (paramState$$: LayoutStateService['paramStateHandler']['state$$']) =>
    (tree: ResourceNode[]) => {
        const layout = tree
            .find(assertResourceOfType.layouts)
            .children.find(
                ({ details }: ResourceNode<Layout>) => details?.items.length,
            ) as ResourceNode<Layout>;
        const camera = tree
            .find(assertResourceOfType.cameras)
            .children.shift() as ResourceNode<NxSystemCamera>;
        const layoutId = cleanIdLegacy((layout || camera)?.details?.id);
        if (layoutId) {
            paramState$$.set({
                params: { layoutId },
            });
        }
        return layoutId || '';
    };
