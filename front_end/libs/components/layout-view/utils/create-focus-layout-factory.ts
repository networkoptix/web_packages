import { Observable, firstValueFrom, merge, map, filter, skip, timeout } from 'rxjs';

import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import { LayoutResourceTree } from '@components/layout-grid/layout-grid.types';
import { Account } from '@services/account.service/account';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { dirtyId, extractVideoLayout } from '@utils/general';

interface CreateFocusLayoutFactoryParams {
    layoutItemLookup$: Observable<LayoutResourceTree>;
    account: Account;
    focusViewToken: string;
    selectedLayout$: Observable<Layout>;
}

export const createFocusLayoutFactory =
    ({
        layoutItemLookup$,
        account,
        focusViewToken,
        selectedLayout$,
    }: CreateFocusLayoutFactoryParams) =>
    async (systemId: string, id: string): Promise<Layout> => {
        const node = await firstValueFrom(
            merge(
                layoutItemLookup$.pipe(
                    map(layoutItems => layoutItems[dirtyId(id)]),
                    filter(Boolean),
                ),
                selectedLayout$.pipe(
                    skip(1),
                    map(() => 'cancel'),
                ),
            ).pipe(timeout({ first: 1000, with: () => Promise.resolve(false as const) })),
        );

        if (typeof node === 'string' || !node) {
            return;
        }

        let rotation = 0;
        let rotatedAspect = false;
        let aspect = 0;
        let bottom = 1;
        let right = 1;

        if (assertResourceOfType.camera(node)) {
            rotation = node.details.parameters?.rotation ?? 0;
            rotatedAspect = Boolean(rotation % 180);
            if (node.details.parameters?.VideoLayout) {
                const { height, width } = extractVideoLayout(node.details.parameters.VideoLayout);
                aspect = node.details.defaultRatio;
                bottom = rotatedAspect ? width : height;
                right = rotatedAspect ? height : width;
            } else {
                aspect = node.details.parameters?.overrideAr || node.details.defaultRatio;
            }
        }

        const cellAspectRatio = rotatedAspect ? 1 / aspect : aspect;
        return {
            backgroundHeight: -1,
            backgroundImageFilename: '',
            backgroundOpacity: 0.699999988079071,
            backgroundWidth: -1,
            cellAspectRatio,
            cellSpacing: 0.0001,
            fixedHeight: 0,
            fixedWidth: 0,
            id,
            items: [
                {
                    bottom,
                    contrastParams: {
                        blackLevel: 0.001,
                        enabled: false,
                        gamma: 1,
                        whiteLevel: 0.0005,
                    },
                    controlPtz: false,
                    dewarpingParams: {
                        enabled: false,
                        fov: 1.2217304763960306,
                        panoFactor: 1,
                        xAngle: 0,
                        yAngle: 0,
                    },
                    displayAnalyticsObjects: false,
                    displayInfo: false,
                    displayRoi: false,
                    flags: 1,
                    id: `{${id}}`,
                    left: 0,
                    resourceId: `{${id}}`,
                    resourcePath: `cloud://${
                        'systemId' in node.details ? node.details.systemId : systemId
                    }.${node.details.id}`,
                    right,
                    rotation: rotation || 0,
                    top: 0,
                    zoomBottom: 0,
                    zoomLeft: 0,
                    zoomRight: 0,
                    zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
                    zoomTop: 0,
                },
            ],
            locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
            logicalId: 0,
            name: focusViewToken,
            systemId,
            parentId: account.id,
        };
    };
