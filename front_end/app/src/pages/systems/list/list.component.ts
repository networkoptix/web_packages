import { CdkDragDrop } from '@angular/cdk/drag-drop';
// import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
// import { NxModalGenericComponent } from '@dialogs/generic/generic.component';
import { NxAccountService, Account } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service';

type SystemTile = NxSystemWithUserInfo & {
    type: 'system';
    name: string;
}

interface GroupTile {
    type: 'group';
    id: string;
    name: string;
    groups: GroupTile[];
    systems: SystemTile[];
}

type Tile = GroupTile | SystemTile

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['../../../components/systems-list/list.component.scss']
})

export class NxSystemGroupsListComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    groups: GroupTile[] = [
        {
            id: '1',
            name: 'Test Group 1',
            groups: [],
            systems: [],
            type: 'group'
        },
        {
            id: '2',
            name: 'Test Group 2',
            groups: [],
            systems: [],
            type: 'group'
        }
    ];

    systemInGroup = new Set<string>();
    dropLists: unknown[];

    showSearch: boolean = false;
    fetchComplete: boolean = false;
    search: { value: string } = { value: '' };
    gettingSystems: Process;
    openClient: unknown;
    tiles: Tile[] = [];
    filteredTiles: Tile[] = [];
    account: Account;
    endpoint: Record<string, boolean> = {};
    userEmail: string;
    searchChanged = new Subject<void>();
    chosenSystemName: string;
    show2faRequired: boolean = false;
    private searchSubscription: Subscription;
    private systemSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        // private utilsService: NxUtilsService,
        private language: NxLanguageProviderService,
        // private genericModal: NxModalGenericComponent,
        private pageService: NxPageService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private dialogsService: NxDialogsService,
        private router: Router,
        // private location: Location
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems?.();
    }

    ngOnInit(): void {
        this.accountService.get()
            .then((account) => {
                if (account?.email) {
                    this.account = account;
                    this.userEmail = account.email;
                    this.systemsService.getSystems(account.email);
                }
            });

        this.systemSubscription = this.systemsService.systemsSubject
            .subscribe((systems) => {
                if (systems === undefined) {
                    return;
                }

                this.tiles = [
                    ...this.groups,
                    ...systems.map(system => ({
                        ...system,
                        type: 'system',
                        name: NxUtilsService.htmlToEntity(system.name)
                        // avoid html being interpreted
                    }) as SystemTile)
                ];

                // this.showSearch = this.tiles.length >= this.CONFIG.search.minSystems;
                this.showSearch = true; // For easier development, remove for release

                this.searchTiles();
            });

        this.gettingSystems = this.processService.createProcess(() => {
            this.fetchComplete = true;
            return this.systemsService.forceUpdateSystems().toPromise();
        }, {
            errorPrefix: this.LANG.errorCodes.cantGetSystemsListPrefix?.(),
            logoutForbidden: true
        });

        this.searchSubscription = this.searchChanged
            .pipe(debounceTime(this.CONFIG.search.debounceTime))
            .subscribe(() => {
                this.searchTiles();
            });
    }

    trackItem(index: number, item: Tile): string | undefined {
        return item ? item.id : undefined;
    }

    getSystemOwnerName(system: NxSystemWithUserInfo, currentEmail: string): string {
        return this.systemsService.getSystemOwnerName(system, currentEmail);
    }

    hasMatch(str: string, search: string): boolean {
        return str.toLowerCase().includes(search.toLowerCase());
    }

    searchTiles(): void {
        const search = this.search.value;

        if (search) {
            this.filteredTiles = this.tiles
                // .filter(({ id }) => !this.systemInGroup.has(id))
                .filter(tile => {
                    if (this.hasMatch(tile.name, search)) {
                        return true;
                    } else if (tile.type === 'group') {
                        // TODO: Other possible search conditions
                    } else if (tile.type === 'system') {
                        return (
                            this.hasMatch(this.LANG.system.mySystemSearch?.(), search) &&
                            tile.ownerAccountEmail === this.accountService.email
                        ) ||
                            this.hasMatch(tile.ownerFullName, search) ||
                            this.hasMatch(tile.ownerAccountEmail, search);
                    }
                });
        } else {
            // this.filteredSystems = this.systems.filter(({ id }) => !this.systemInGroup.has(id));
            this.filteredTiles = this.tiles;
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }

    private isActive(val: string): boolean {
        return this.router.url.includes(val);
    }

    updateEndpoint(id: string): void {
        this.endpoint.ipvd = this.isActive('/ipvd');
        this.endpoint.integrations = this.isActive('/integrations');
        this.endpoint.register = this.isActive('/register');
        this.endpoint.view = this.isActive('/view');
        this.endpoint.information = this.isActive('/health');
        this.endpoint.settings = id &&
            this.isActive('/systems') &&
            !this.isActive('/view') &&
            !this.isActive('/health');
    }

    openGroup(group: GroupTile): void {
        // TODO
    }

    openSystem(system: NxSystemWithUserInfo): void {
        if (this.needToConfigureTwoFactor(system)) {
            this.chosenSystemName = system.name;
            this.show2faRequired = true;
        } else {
            this.updateEndpoint(system.id);
            this.headerService.show$ = false;
            this.uriService.updateURI(
                this.menusService.getUrl(system.id, this.endpoint)
            ).then(() => {
                const activeSystem = this.headerService.activeSystem ||
                    this.headerService.lastActive$.value ||
                    this.tiles[0];
                this.menusService.updateActiveSystemMenu(activeSystem);
            }).catch(err => { console.error(err); });
        }
    }

    canShowTag(system: NxSystemWithUserInfo): boolean {
        return system.stateOfHealth !== this.CONFIG.system.status.online &&
            !!this.LANG.systemStatuses;
    }

    canShowButton(system: NxSystemWithUserInfo): boolean {
        return this.LANG.system &&
            system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor(system);
    }

    needToConfigureTwoFactor(system: NxSystemWithUserInfo): boolean {
        return system.system2faEnabled && !this.account.account2faEnabled;
    }

    newGroup(): void {
        this.dialogsService.createSystemGroup().then((res: GroupTile) => {
            this.groups.push(res);
            let lastIndex = -1;
            this.filteredTiles.forEach((item, index) => {
                if (item.type === 'group') {
                    lastIndex = index;
                }
            });
            const { filteredTiles } = this;
            filteredTiles.splice(lastIndex > -1 ? lastIndex + 1 : 0, 0, res);
            this.filteredTiles = filteredTiles;
        }, () => {
            // Handle cancel
        });
    }

    getTileIndex(id: string): number {
        return this.filteredTiles.findIndex(tile => tile.id === id);
    }

    drop(event: CdkDragDrop<Tile>): void {
        const previousTile: Tile = event.item.data; // Dragged tile
        const currentTile = event.container.data; // Dropped onto tile
        const previousIndex = this.getTileIndex(previousTile.id);
        let currentIndex = this.getTileIndex(currentTile.id);
        if (!event.isPointerOverContainer || currentTile.id === previousTile.id) {
            return;
        }
        if (currentTile.type === 'group') {
            this.filteredTiles.splice(previousIndex, 1);
            if (previousIndex < currentIndex) {
                currentIndex += -1;
            }
            if (currentIndex >= this.filteredTiles.length) {
                currentIndex = this.filteredTiles.length - 1;
            }

            const targetGroupTile = this.filteredTiles[currentIndex] as GroupTile;
            if (previousTile.type === 'system') {
                // Add system to group
                targetGroupTile.systems.push(previousTile);
            } else {
                // Nest group inside another group
                targetGroupTile.groups.push(previousTile);
            }
            const groupIndex = this.groups.findIndex((group) =>
                group.id === currentTile.id
            );
            this.groups[groupIndex] = { ...targetGroupTile };
            this.systemInGroup.add(previousTile.id);
        }
    }

    ngOnDestroy(): void {}
}
