import {
    Component,
    Input,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriService } from '@services/uri.service';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-drop-menu',
    templateUrl: 'drop-menu.component.html',
    styleUrls: ['drop-menu.component.scss']
})
export class NxDropMenu extends BaseDropdown {
    @Input() endpoint: any = {};
    @Input() systems: any[] = [];
    menuNodes$ = new BehaviorSubject<MenuNode[]>([]);
    activeSystemMenu: MenuNode;
    columns$ = new BehaviorSubject(4);
    systems$ = new BehaviorSubject([]);
    additionalSystems$ = new BehaviorSubject(0);
    columnWidth = 236;

    systemCounter: number;
    active = {
        health: false,
        register: false,
        settings: false,
        view: false
    };

    params: any;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private uriService: NxUriService,
        public headerService: NxHeaderService,
        private menusService: NxMenusService,
        private accountService: NxAccountService
    ) {
        super(languageService, configService);
        this.menusService.currentSystemNode$.subscribe(_ => {
            this.menusService.getMenu('header', this.systems$.value.length >= 1)
                .subscribe(header => {
                    const nodes = this.menusService.cleanEmptyNodes(header.nodes);
                    if (environment.isLocal) {
                        this.replaceCloudHost(nodes);
                    }
                    this.menuNodes$.next(nodes);
                });
        });
    }

    replaceCloudHost(nodes) {
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
    handleResize({ width }) {
        if (!width) return;
        const minWidth = 160;

        // Determines columns and columnWidths
        this.columns$.next(Math.min(width / minWidth | 0, 4));
        this.columnWidth = (width / this.columns$.value | 0);

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
                    : this.systems.length
        );
        this.systems$.next(systems);

        // Updates additional systems tile
        const additionalSystems = this.systems.length - systems.length;
        this.additionalSystems$.next(additionalSystems);
    }

    updateURI(sid = this.headerService.activeSystem.id, endpoint, home = false) {
        this.headerService.show$ = false;
        this.uriService.updateURI(this.menusService.getUrl(sid, endpoint, home)).then(() => {
            const activeSystem = this.headerService.activeSystem ||
                this.headerService.lastActive$.value ||
                this.systems[0];
            this.menusService.updateActiveSystemMenu(activeSystem);
        });
    }

    async ngOnChanges(changes: NgChanges<NxDropMenu>) {
        if (changes.systems.currentValue !== changes.systems.previousValue) {
            // Todo: Fix so that it checks for admin correctly.
            let user: any;
            if (environment.isLocal) {
                user = await this.accountService.mediaServerApi.getCurrentUser(true);
            } else {
                user = await this.accountService.get(true);
            }
            const isAdmin = user?.permissions?.includes('GlobalAdminPermission') || false;
            this.systems$.next(changes.systems.currentValue);
            const activeSystem = this.headerService.activeSystem ||
                this.headerService.lastActive$.value ||
                this.systems[0];
            this.menusService.updateActiveSystemMenu(activeSystem, isAdmin);
        }
        this.systemCounter = this.systems && this.systems.length;
    }

    ngOnDestroy(): void {}
}
