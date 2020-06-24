/* eslint-disable camelcase */
import {
    Component, Input, SimpleChanges, Inject
}                           from '@angular/core';
import { BaseDropdown }     from '../injDropdown';
import { BehaviorSubject, Subject }  from 'rxjs';
import { MenuNode } from './navigation-tile/navigation-tile.component';
import { takeUntil } from 'rxjs/operators';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxConfigService } from '../../../services/nx-config';
import { NxUriService } from '../../../services/uri.service';
import { NxHeaderService } from '../../../services/nx-header.service';
import { NxMenusService, Auth } from '../../../services/menus.service';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-drop-menu',
    templateUrl : 'drop-menu.component.html',
    styleUrls   : ['drop-menu.component.scss']
})
export class NxDropMenu extends BaseDropdown {
    @Input() endpoint: any = {};
    @Input() systems: any[] = [];
    menuNodes$ = new BehaviorSubject<MenuNode[]>([]);
    activeSystemMenu: MenuNode;
    columns$ = new BehaviorSubject(4);
    systems$ = new BehaviorSubject([]);
    additionalSystems$ = new BehaviorSubject(0);
    columnWidth = 240;

    systemCounter: number;
    active = {
        health   : false,
        register : false,
        settings : false,
        view     : false
    };

    params: any;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private uriService: NxUriService,
        public headerService: NxHeaderService,
        private menusService: NxMenusService
    ) {
        super(languageService, configService);
        this.menusService.currentSystemNode$.subscribe(_ => {
            this.menusService.getMenu('Header', this.systems$.value.length >= 1)
                .subscribe(header => this.menuNodes$.next(header));
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

    getUrl(sid = this.headerService.activeSystem.id, endpoint = this.endpoint) {
        this.headerService.show$ = false;
        let url = this.CONFIG.isLocal ? '/settings' : '/systems/' + sid;
        if (!this.CONFIG.isLocal && sid) {
            if (endpoint.view) {
                url += '/view';
            }

            if (endpoint.information) {
                url += '/health';
            }
        } else {
            if (endpoint.view) {
                url = '/view';
            }

            if (endpoint.information) {
                url = '/health';
            }
        }
        return url;
    }

    updateURI(sid = this.headerService.activeSystem.id, endpoint = this.endpoint) {
        this.uriService.updateURI(this.getUrl(sid, endpoint)).then(_ => {
            this.updateActiveSystemMenu();
        });
    }

    updateActiveSystemMenu() {
        const { endpoint: { view = false, settings = false, information = false } } = this;
        const activeSystem = this.headerService.activeSystem || this.headerService.lastActive$.value || this.systems[0];
        const name = activeSystem.name || activeSystem.moduleInfo.name;
        const icon = activeSystem.stateOfHealth === this.CONFIG.system.status.online ? 'systems.svg' : 'system_offline.svg';

        const viewNode = new MenuNode(
            'View',
            this.getUrl(activeSystem.id, { view: true })
        );
        viewNode.currentRoute = view;
        const settingsNode = new MenuNode(
            'Settings',
            this.getUrl(activeSystem.id, { settings: true })
        );
        settingsNode.currentRoute = settings;

        const informationNode = new MenuNode(
            'Information',
            this.getUrl(activeSystem.id, { information: true })
        );
        informationNode.currentRoute = information;
        const nodes = [viewNode, settingsNode, informationNode];

        this.activeSystemMenu = new MenuNode(
            name,
            '',
            icon,
            nodes,
            Auth.LOGGED_IN,
            name
        );

        this.menusService.currentSystemNode$.next(this.activeSystemMenu);
    }

    ngOnInit(): void {
        if (this.systems) {
            this.systemCounter = this.systems.length;
            this.systems$.next(this.systems);
            this.updateActiveSystemMenu();
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.systems.currentValue !== changes.systems.previousValue) {
            this.systems$.next(changes.systems.currentValue);
            this.updateActiveSystemMenu();
        }
        this.systemCounter = this.systems && this.systems.length;
    }

    ngOnDestroy(): void {}
}
