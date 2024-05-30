import { NestedTreeControl } from '@angular/cdk/tree';
import { computed, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom, Observable } from 'rxjs';

import { MenuItemsOrMenuItemsFactory } from '@components/context-menu/context-menu.types';
import {
    BaseResourceNode,
    ResourceNode,
    ResourceNodeMap,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { selectLayoutResolution } from '@services/layout-state/store/layouts-resolution/resolution.selectors';
import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { cleanIdLegacy } from '@utils/general';

import { getFullScreenActionsFactory } from './actions/get-full-screen-actions-factory';
import { getLayoutEditActionsFactory } from './actions/get-layout-edit-actions-factory';
import { getLayoutLockActionsFactory } from './actions/get-layout-lock-actions-factory';
import { getLayoutResolutionActionsFactory } from './actions/get-layout-resolution-actions-factory';
import { getLayoutShareActionsFactory } from './actions/get-layout-share-actions-factory';
import { getLayoutUpdateActionsFactory } from './actions/get-layout-update-actions-factory';
import { openWindowActionsFactory } from './actions/open-window-actions-factory';
import { cameraMenuFactory } from './menus/camera-menu-factory';
import { layoutMenuFactory } from './menus/layout-menu-factory';
import { layoutsMenuFactory } from './menus/layouts-menu-factory';
import { serverMenuFactory } from './menus/server-menu-factory';
import { systemMenuFactory } from './menus/system-menu-factory';

/**
 * Abstract class that provides menu items for each resource type.
 *
 * The abstract properties can be implemented within a component class or within a
 * test harness class.
 *
 * Generally each menu has it's own factory and each menu item that is non-trivial in
 * complexity would also have it's own factory. Unit tests should generally be done
 * using those factories.
 *
 * This class is just provided in case we ever needed to do more integrated tests
 * on the menu.
 */
export abstract class WithMenuItemsByType {
    abstract layoutStateService: LayoutStateService;
    abstract layout: Layout;
    abstract system: NxSystem;
    abstract treeControl: NestedTreeControl<ResourceNode, string>;
    abstract dataSourceInput$$: Signal<BaseResourceNode[]>;
    abstract dataSource$: Observable<ResourceNode[]>;
    protected abstract store: Store;
    protected abstract systemsService: NxSystemsService;
    protected abstract router: Router;

    openWindow = (id: string, isNewWindow = false): void => {
        const params = [
            `${this.router.url.split('layouts')[0]}layouts/${cleanIdLegacy(id)}`,
            '_blank',
        ];
        if (isNewWindow) {
            params.push('"width=100%, height=100%"');
        }

        window.open(...params);
    };

    readonly OPEN_WINDOW_ACTIONS = openWindowActionsFactory(this.openWindow);

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]:
            | MenuItemsOrMenuItemsFactory<ResourceNodeMap[key]>
            | {
                  [Property in keyof { tree: string; scene: string }]: MenuItemsOrMenuItemsFactory<
                      ResourceNodeMap[key]
                  >;
              };
    }> = {
        [ResourceType.LAYOUTS]: layoutsMenuFactory(
            () => this.layoutStateService.createNewLayout(),
            node => this.treeControl.expand(node),
            () => this.dataSourceInput$$().find(({ type }) => type === ResourceType.LAYOUTS),
            () => this.dataSource$,
            params => this.layoutStateService.editedLayout$$.set(params),
        ),
        [ResourceType.LAYOUT]: layoutMenuFactory({
            getLayoutLockActions: getLayoutLockActionsFactory(
                layout => this.layoutStateService.lockLayout(layout),
                layout => this.layoutStateService.unlockLayout(layout),
            ),
            getLayoutEditActions: getLayoutEditActionsFactory(
                layoutId => this.layoutStateService.deleteLayout(layoutId),
                layout => this.layoutStateService.duplicateAsNewLayout(layout),
                layout => this.layoutStateService.editedLayout$$.set(layout),
            ),
            getLayoutUpdateActions: getLayoutUpdateActionsFactory(
                layoutId => this.layoutStateService.discardUnsavedLayout(layoutId),
                layoutId => this.layoutStateService.saveLayout(layoutId),
                layoutId =>
                    computed(() => {
                        const unsavedLayoutIds = this.layoutStateService.unsavedLayoutsIds$$();
                        return !unsavedLayoutIds?.[layoutId];
                    }),
            ),
            openWindowActions: this.OPEN_WINDOW_ACTIONS,
            getLayoutShareActions: getLayoutShareActionsFactory(
                layout => this.layoutStateService.shareLayout(layout),
                layout => this.layoutStateService.unshareLayout(layout),
            ),
            getFullScreenActions: getFullScreenActionsFactory(
                () => this.layoutStateService.toggleLayoutFullScreen(),
                () => this.layout.id,
            ),
            getLayoutResolutionActions: getLayoutResolutionActionsFactory(
                (nodeId: string) =>
                    firstValueFrom(this.store.select(selectLayoutResolution(nodeId))),
                params => this.layoutStateService.setLayoutResolution(params),
            ),
        }),
        [ResourceType.CAMERA]: cameraMenuFactory(
            camera =>
                import('@pages/systems/settings/cameras/cameras.component').then(m => {
                    this.layoutStateService.createPortal(m.NxCamerasComponent, {
                        system: this.system,
                        camera,
                    });
                }),
            this.OPEN_WINDOW_ACTIONS,
        ),
        [ResourceType.SERVER]: serverMenuFactory(
            server =>
                import('@pages/systems/settings/servers/servers.component').then(m => {
                    this.layoutStateService.createPortal(m.NxSystemServersComponent, {
                        system: this.system,
                        server,
                    });
                }),
            this.OPEN_WINDOW_ACTIONS,
        ),
        [ResourceType.SYSTEM]: systemMenuFactory(
            () => {
                return !!this.layout.systemId;
            },
            () => this.systemsService.systems$$() || [],
            params => this.layoutStateService.paramStateHandler.state$$.update(params),
        ),
    };
}
