import { CdkDragMove } from '@angular/cdk/drag-drop';
import { computed, EventEmitter, Injectable, Signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import {
    AddResourceType,
    EditResourceType,
    RemoveResourceType,
} from '@services/layout-grid/layout-grid.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { LayoutItem } from '@services/system-api.types';

interface LayoutSettings {
    openMenu: 'left' | 'right' | 'both';
    previousOpenMenu: 'left' | 'right' | 'both';
}

@Injectable({
    providedIn: 'root',
})
export class NxLayoutGridService {
    private layoutSettings: CustomAccountProperty<LayoutSettings>;

    // TODO change to signals later on, move to "LayoutLayouts" Service - start
    addResource = new EventEmitter<AddResourceType>();
    editResource = new EventEmitter<EditResourceType>();
    removeResource = new EventEmitter<RemoveResourceType>();

    addItem = new EventEmitter<ResourceNode>();
    moveAddedItem = new EventEmitter<{ event: CdkDragMove; itemParent?: HTMLElement }>();
    changeView = new EventEmitter<ResourceNode | LayoutItem>();
    // TODO - end

    constructor(activatedRoute: ActivatedRoute, private cloudApi: NxCloudApiService) {
        const systemId: string = activatedRoute.snapshot.params.systemId;
        this.layoutSettings = this.cloudApi.customAccountPropertyFactory(`layouts_${systemId}`, {
            openMenu: 'left',
            previousOpenMenu: null,
        });
    }

    isLeftMenuOpen$$: Signal<boolean> = computed(
        () => this.layoutSettings.signal$$().openMenu === 'left',
    );

    toggleMenu(menu: 'left' | 'right' | 'both' = null, force = false): void {
        this.layoutSettings.update(curr => {
            menu ||= curr.previousOpenMenu;
            if (!curr.openMenu || force) {
                if (curr.openMenu) {
                    curr.previousOpenMenu = curr.openMenu;
                }
                curr.openMenu = curr.openMenu === menu ? null : menu;
            }

            return curr;
        }, true);
    }

    handleMenuClose = (): void => {
        this.layoutSettings.update(
            curr =>
                curr.openMenu
                    ? {
                          ...curr,
                          previousOpenMenu: curr.openMenu,
                          openMenu: null,
                      }
                    : curr,
            true,
        );
    };

    handleMenuOpen = (): void => {
        this.layoutSettings.update(
            curr =>
                curr.previousOpenMenu
                    ? {
                          ...curr,
                          openMenu: curr.previousOpenMenu,
                          previousOpenMenu: null,
                      }
                    : curr,
            true,
        );
    };
}
