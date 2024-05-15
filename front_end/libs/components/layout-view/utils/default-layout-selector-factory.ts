import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    NxSystemCameraWithMappedFields,
    ResourceLeafNode,
    ResourceNode,
    ResourceParentNode,
} from '@components/layout-grid/layout-grid.types';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { cleanIdLegacy } from '@utils/general';

const findFirstCamera = (
    cameras: (
        | ResourceLeafNode<NxSystemCameraWithMappedFields>
        | ResourceParentNode<NxSystemCameraWithMappedFields>
    )[],
): ResourceNode<NxSystemCamera> | undefined => {
    const camera = cameras.find(assertResourceOfType.camera);

    if (camera) {
        return camera;
    }

    const cameraGroups = cameras.filter(assertResourceOfType.cameras_group);
    if (cameraGroups.length) {
        return findFirstCamera(cameraGroups);
    }
};

export const defaultLayoutSelectorFactory =
    (paramState$$: LayoutStateService['paramStateHandler']['state$$']) =>
    (tree: ResourceNode[]) => {
        const layout = tree
            .find(assertResourceOfType.layouts)
            ?.children.find(({ details }: ResourceNode<Layout>) => details?.items.length);
        const camera = findFirstCamera(tree.find(assertResourceOfType.cameras)?.children || []);
        const layoutId = cleanIdLegacy((layout || camera)?.details?.id);
        if (layoutId) {
            paramState$$.set({
                params: { layoutId },
            });
        }
        return layoutId || '';
    };
