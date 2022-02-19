import { CdkDragDrop } from '@angular/cdk/drag-drop';
// import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, Subscription } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
// import { NxModalGenericComponent } from '@dialogs/generic/generic.component';
import { NxAccountService, Account } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
// import { NxProcessService, Process } from '@services/process.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service';

import { NxSystemGroupsService, IGroups } from '../../services/system-groups.service';

interface SystemTile extends NxSystemWithUserInfo {
    readonly type: 'system';
    name: string;
}

class GroupTile {
    readonly type = 'group';

    constructor(
        public id: string,
        public name: string,
        public readonly groups: GroupTile[] = [],
        public readonly systems: SystemTile[] = [],
    ) {}

    get tiles(): Tile[] {
        return [...this.groups, ...this.systems];
    }

    addGroup(group: GroupTile): void {
        this.groups.push(group);
    }

    addSystem(system: SystemTile): void {
        this.systems.push(system);
    }
}

type Tile = GroupTile | SystemTile

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'system-groups.component.html',
    styleUrls: ['../../../../../components/systems-list/list.component.scss']
})

export class NxSystemGroupsPageComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    groups: GroupTile[] = [
        // new GroupTile('1', 'Test Group 1', [new GroupTile('3', 'Test Group 3')]),
    ];

    systemInGroup = new Set<string>();
    dropLists: unknown[];

    showSearch: boolean = false;
    fetchComplete: boolean = false;
    search: { value: string } = { value: '' };
    openClient: unknown;
    systems: SystemTile[];
    currentIndexes: number[] = []
    filteredTiles: Tile[] = [];
    account: Account;
    endpoint: Record<string, boolean> = {};
    userEmail: string;
    searchChanged = new Subject<void>();
    chosenSystemName: string;
    show2faRequired: boolean = false;
    show404: boolean = false;
    private searchSubscription: Subscription;
    private systemSubscription: Subscription;
    private routerParamsSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        // private utilsService: NxUtilsService,
        private language: NxLanguageProviderService,
        // private genericModal: NxModalGenericComponent,
        private pageService: NxPageService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        // private processService: NxProcessService,
        private uriService: NxUriService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private dialogsService: NxDialogsService,
        private router: Router,
        // private location: Location,
        private route: ActivatedRoute,
        protected groupsService: NxSystemGroupsService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems?.();

        this.onGroupsChanged = this.onGroupsChanged.bind(this);
    }

    public tiles: Array<Tile> = []

    protected _updateTiles() {
        this.tiles = [...this.groups || [], ...this.systems || []];
    }

    onGroupsChanged(groups: Array<GroupTile>) {
        this.groups = groups;
        this._updateTiles();
    }

    ngOnInit(): void {
        this.accountService.get()
            .then(account => {
                if (account?.email) {
                    this.account = account;
                    this.userEmail = account.email;
                    this.systemsService.getSystems(account.email);
                }
            });

        this.systemSubscription = this.systemsService.systemsSubject
            .subscribe(systems => {
                if (systems === undefined) {
                    return;
                }

                this.systems = systems.map(system => ({
                    ...system,
                    type: 'system',
                    name: NxUtilsService.htmlToEntity(system.name)
                    // avoid html being interpreted
                }) as SystemTile);

                // this.showSearch = this.tiles.length >= this.CONFIG.search.minSystems;
                this.showSearch = true; // For easier development, remove for release

                // this.searchTiles();

                this._updateTiles();
            });

        function findTargetAddress(
            targetId: string,
            currentLevel: GroupTile[],
            addressBase: number[] = [],
            targetAddress: number[] = [],
        ): number[] {
            for (let i = 0; i < currentLevel.length; i++) {
                if (targetAddress.length) {
                    break;
                }

                const currentGroup = currentLevel[i];
                const currentAddress = [...addressBase, i];
                if (currentGroup.id === targetId) {
                    targetAddress.push(...currentAddress);
                    break;
                }

                findTargetAddress(
                    targetId,
                    currentGroup.groups,
                    currentAddress,
                    targetAddress,
                );
            }
            return targetAddress;
        }

        this.routerParamsSubscription = this.route.params.subscribe(params => {
            this.show404 = false;
            const { groupId } = params;

            if (!groupId) {
                this.filteredTiles = this.tiles;
                return;
            }

            const targetAddress = findTargetAddress(groupId, this.groups);

            if (targetAddress.length) {
                this.currentIndexes = targetAddress;
                this.filteredTiles = this.currentTiles;
            } else {
                this.show404 = true;
            }
        });

        this.searchSubscription = this.searchChanged
            .pipe(debounceTime(this.CONFIG.search.debounceTime))
            .subscribe(() => {
                this.searchTiles();
            });

        this.groupsService.refetch();
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

    // get tiles(): Tile[] {
    //     return [...this.groups, ...this.systems];
    // }

    private get currentTiles(): Tile[]  {
        if (!this.currentIndexes.length) {
            return this.tiles;
        } else {
            let currentGroup = { groups: this.groups } as GroupTile;
            for (const index of this.currentIndexes) {
                currentGroup = currentGroup.groups[index];
            }
            return currentGroup.tiles;
        }
    }

    searchTiles(): void {
        const search = this.search.value;

        if (search) {
            this.filteredTiles = this.currentTiles
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
            this.filteredTiles = this.currentTiles;
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

    backToTopLevel(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    openGroup(group: GroupTile): void {
        this.router.navigate(['systems', 'groups', group.id]);
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
            // this.groups.push(res);
            // persistence, should trigger re-render via subject update
            this.groupsService.addGroup(res.name, res.id);
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

    settingsDialog(): void {
        this.dialogsService.systemGroupSettings().then(() => {
            // Handle success
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
                // targetGroupTile.addSystem(previousTile);

                // persistence, should trigger re-render via subject update
                this.groupsService.setGroupForTheSystem(previousTile.id, currentTile.id);
            } else {
                // Nest group inside another group
                // targetGroupTile.addGroup(previousTile);

                // persistence, should trigger re-render via subject update
                this.groupsService.setGroupParent(previousTile.id, currentTile.id);
            }
            this.systemInGroup.add(previousTile.id);
        }
    }

    ngOnDestroy(): void {}
}
