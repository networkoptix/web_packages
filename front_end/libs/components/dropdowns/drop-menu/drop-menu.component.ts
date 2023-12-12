import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivationEnd, NavigationCancel, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { NxAdditionalSystemsTileComponent } from '@components/dropdowns/drop-menu/additional-systems-tile/additional-systems-tile.component';
import { NxNavigationTileComponent } from '@components/dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { NxSystemTileComponent } from '@components/dropdowns/drop-menu/system-tile/system-tile.component';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxUriService } from '@services/uri.service';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

@UntilDestroy()
@Component({
    selector: 'nx-drop-menu',
    templateUrl: 'drop-menu.component.html',
    styleUrls: ['drop-menu.component.scss'],
    imports: [
        CommonModule,
        NxAdditionalSystemsTileComponent,
        NxNavigationTileComponent,
        NxSystemTileComponent,
        NxResizeObserver,
        NxArrowNavDirective,
    ],
    standalone: true,
})
export class NxDropMenu extends BaseDropdown {
    @Input() endpoint: any = {};
    @Input() systems: any[] = [];
    menuNodes$: Observable<MenuNode[]>;
    columns$ = new BehaviorSubject(4);
    systems$ = new BehaviorSubject([]);
    additionalSystems$ = new BehaviorSubject(0);
    columnWidth = 236;

    systemCounter: number;
    active = {
        health: false,
        register: false,
        settings: false,
        view: false,
    };

    params: any;

    constructor(
        translateService: TranslateService,
        private router: Router,
        private uriService: NxUriService,
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
    ) {
        super();
        this.menuNodes$ = combineLatest([
            this.menusService.currentSystemNode$,
            this.headerService.nodes$,
        ]).pipe(
            map(([systemNode, menuNodes]) => {
                const nodes = [...menuNodes];
                if (systemNode) {
                    nodes.unshift(systemNode);
                }
                this.replaceCloudHost(nodes);
                return nodes;
            }),
            takeUntilDestroyed(),
        );

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter(
                    event => event instanceof ActivationEnd || event instanceof NavigationCancel,
                ),
            )
            .subscribe(() => {
                this.headerService.show$ = false;
            });
    }

    replaceCloudHost(nodes): void {
        nodes.forEach(node => {
            node.url = node.url.replace('{{CLOUD_HOST}}', this.CONFIG.cloudHost);
            this.replaceCloudHost(node.nodes);
        });
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    /**
     * This is used to calculate the columns and column width based on clamping the size to the minimum and maximum tile
     * sizes from the spec. Updates are triggered by a (resize) directive on the containing element.
     * @param event$ - {width: number}
     */
    handleResize({ width }): void {
        if (!width) {
            return;
        }
        const minWidth = 160;

        // Determines columns and columnWidths
        this.columns$.next(Math.min((width / minWidth) | 0, 4));
        this.columnWidth = (width / this.columns$.value) | 0;

        // Max systems to display, use the number of columns as the index to determine which value to use
        const systemLimitByColumns = [0, 5, 8, 12, 16];
        const maxSystems = systemLimitByColumns[this.columns$.value];

        // Limits systems to maxSystems or maxSystems - 1 if more than max systems available
        const systems = this.systems.slice(
            0,
            this.systems.length === maxSystems
                ? maxSystems
                : this.systems.length > maxSystems
                  ? maxSystems - 1
                  : this.systems.length,
        );
        this.systems$.next(systems);

        // Updates additional systems tile
        const additionalSystems = this.systems.length - systems.length;
        this.additionalSystems$.next(additionalSystems);
    }

    updateURI(sid = this.headerService.activeSystem.id, endpoint, home = false): void {
        this.headerService.show$ = false;
        this.uriService.updateURI(this.menusService.getUrl(sid, endpoint, home));
    }

    async ngOnChanges(changes: NgChanges<NxDropMenu>): Promise<void> {
        if (changes.systems.currentValue !== changes.systems.previousValue) {
            if (changes.systems.currentValue[0] === undefined) {
                return; // Account for weird state to avoid errors
            }
            this.systems$.next(changes.systems.currentValue);
        }
        this.systemCounter = this.systems && this.systems.length;
    }
}
