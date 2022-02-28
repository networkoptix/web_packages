import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import type { NxSystemWithUserInfo } from '@services/systems.service';
import { selectSystems } from '@src/store/systems/systems.selectors';
import { SystemsState } from '@src/store/systems/systems.state';

import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups/groups.actions';
import {
    selectGroupState,
    IGroup,
    selectGroupForest,
} from '../../store/groups/groups.selectors';
import { GroupsState } from '../../store/groups/groups.state';

@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'system-groups-index-page.component.html',
    styleUrls: ['./system-groups-index-page.component.scss']
})
export class NxSystemGroupsIndexPageComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    _groupForest$: Observable<IGroup[]> = this.store.select(selectGroupForest);
    _groups$: Observable<GroupsState> = this.store.select(selectGroupState);
    _systems$: Observable<SystemsState> = this.store.select(selectSystems);
    ungroupedSystems: NxSystemWithUserInfo[] = [];

    constructor(
        configService: NxConfigService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems();
    }

    ngOnInit(): void {
        // TODO: Restore when backend endpoint is operational
        // this.groupsService.loadGroups().toPromise().then((response: any) => {
        //     if ('systemsToGroupsHash' in response) { // TODO: remove later on
        //         response.systemGroups = response.systemsToGroupsHash;
        //     }
        //     this.store.dispatch(GroupActions.load({ newState: <GroupsState>response }));
        // });

        combineLatest([this._groups$, this._systems$])
            .subscribe(([groups, systems]) => {
                this.ungroupedSystems = systems.filter(s =>
                    !groups.systemGroups[s.id]
                );
            });
    }

    ngOnDestroy(): void {}

    newGroup(): void {
        this.dialogsService.createSystemGroup();
    }

    moveSystem(): void {
        this.dialogsService.moveSystemToGroup();
    }
}

// export class NxSystemGroupsPageComponent implements OnInit, OnDestroy {
//     CONFIG: IConfig;
//     LANG: LanguageI18NStaticTypes;

//     groups: GroupTile[] = [
//         new GroupTile('1', 'Test Group 1', [new GroupTile('3', 'Test Group 3')]),
//         new GroupTile('2', 'Test Group 2'),
//     ];

//     systemInGroup = new Set<string>();
//     dropLists: unknown[];

//     showSearch: boolean = false;
//     fetchComplete: boolean = false;
//     search: { value: string } = { value: '' };
//     openClient: unknown;
//     systems: SystemTile[];
//     currentIndexes: number[] = []
//     filteredTiles: Tile[] = [];
//     account: Account;
//     endpoint: Record<string, boolean> = {};
//     userEmail: string;
//     searchChanged = new Subject<void>();
//     chosenSystemName: string;
//     show2faRequired: boolean = false;
//     show404: boolean = false;
//     private searchSubscription: Subscription;
//     private systemSubscription: Subscription;
//     private routerParamsSubscription: Subscription;

//     constructor(
//         configService: NxConfigService,
//         // private utilsService: NxUtilsService,
//         private language: NxLanguageProviderService,
//         // private genericModal: NxModalGenericComponent,
//         private pageService: NxPageService,
//         private systemsService: NxSystemsService,
//         private accountService: NxAccountService,
//         // private processService: NxProcessService,
//         private uriService: NxUriService,
//         private headerService: NxHeaderService,
//         private menusService: NxMenusService,
//         private dialogsService: NxDialogsService,
//         private router: Router,
//         // private location: Location,
//         private route: ActivatedRoute,
//     ) {
//         this.CONFIG = configService.getConfig();
//         this.LANG = this.language.translations;

//         this.pageService.pageTitle = this.LANG.pageTitles.systems?.();
//     }

//     ngOnInit(): void {
//         this.accountService.get()
//             .then(account => {
//                 if (account?.email) {
//                     this.account = account;
//                     this.userEmail = account.email;
//                     this.systemsService.getSystems(account.email);
//                 }
//             });

//         this.systemSubscription = this.systemsService.systemsSubject
//             .subscribe(systems => {
//                 if (systems === undefined) {
//                     return;
//                 }

//                 this.systems = systems.map(system => ({
//                     ...system,
//                     type: 'system',
//                     name: NxUtilsService.htmlToEntity(system.name)
//                     // avoid html being interpreted
//                 }) as SystemTile);

//                 // this.showSearch = this.tiles.length >= this.CONFIG.search.minSystems;
//                 this.showSearch = true; // For easier development, remove for release

//                 // this.searchTiles();
//             });

//         function findTargetAddress(
//             targetId: string,
//             currentLevel: GroupTile[],
//             addressBase: number[] = [],
//             targetAddress: number[] = [],
//         ): number[] {
//             for (let i = 0; i < currentLevel.length; i++) {
//                 if (targetAddress.length) {
//                     break;
//                 }

//                 const currentGroup = currentLevel[i];
//                 const currentAddress = [...addressBase, i];
//                 if (currentGroup.id === targetId) {
//                     targetAddress.push(...currentAddress);
//                     break;
//                 }

//                 findTargetAddress(
//                     targetId,
//                     currentGroup.groups,
//                     currentAddress,
//                     targetAddress,
//                 );
//             }
//             return targetAddress;
//         }

//         this.routerParamsSubscription = this.route.params.subscribe(params => {
//             this.show404 = false;
//             const { groupId } = params;

//             if (!groupId) {
//                 this.filteredTiles = this.tiles;
//                 return;
//             }

//             const targetAddress = findTargetAddress(groupId, this.groups);

//             if (targetAddress.length) {
//                 this.currentIndexes = targetAddress;
//                 this.filteredTiles = this.currentTiles;
//             } else {
//                 this.show404 = true;
//             }
//         });

//         this.searchSubscription = this.searchChanged
//             .pipe(debounceTime(this.CONFIG.search.debounceTime))
//             .subscribe(() => {
//                 this.searchTiles();
//             });
//     }

//     trackItem(index: number, item: Tile): string | undefined {
//         return item ? item.id : undefined;
//     }

//     getSystemOwnerName(system: NxSystemWithUserInfo, currentEmail: string): string {
//         return this.systemsService.getSystemOwnerName(system, currentEmail);
//     }

//     hasMatch(str: string, search: string): boolean {
//         return str.toLowerCase().includes(search.toLowerCase());
//     }

//     get tiles(): Tile[] {
//         return [...this.groups, ...this.systems];
//     }

//     private get currentTiles(): Tile[]  {
//         if (!this.currentIndexes.length) {
//             return this.tiles;
//         } else {
//             let currentGroup = { groups: this.groups } as GroupTile;
//             for (const index of this.currentIndexes) {
//                 currentGroup = currentGroup.groups[index];
//             }
//             return currentGroup.tiles;
//         }
//     }

//     searchTiles(): void {
//         const search = this.search.value;

//         if (search) {
//             this.filteredTiles = this.currentTiles
//                 // .filter(({ id }) => !this.systemInGroup.has(id))
//                 .filter(tile => {
//                     if (this.hasMatch(tile.name, search)) {
//                         return true;
//                     } else if (tile.type === 'group') {
//                         // TODO: Other possible search conditions
//                     } else if (tile.type === 'system') {
//                         return (
//                             this.hasMatch(this.LANG.system.mySystemSearch?.(), search) &&
//                             tile.ownerAccountEmail === this.accountService.email
//                         ) ||
//                             this.hasMatch(tile.ownerFullName, search) ||
//                             this.hasMatch(tile.ownerAccountEmail, search);
//                     }
//                 });
//         } else {
//             // this.filteredSystems = this.systems.filter(({ id }) => !this.systemInGroup.has(id));
//             this.filteredTiles = this.currentTiles;
//         }
//     }

//     setSearch(model: { query: string }): void {
//         this.search.value = model.query;
//         this.searchChanged.next();
//     }

//     private isActive(val: string): boolean {
//         return this.router.url.includes(val);
//     }

//     updateEndpoint(id: string): void {
//         this.endpoint.ipvd = this.isActive('/ipvd');
//         this.endpoint.integrations = this.isActive('/integrations');
//         this.endpoint.register = this.isActive('/register');
//         this.endpoint.view = this.isActive('/view');
//         this.endpoint.information = this.isActive('/health');
//         this.endpoint.settings = id &&
//             this.isActive('/systems') &&
//             !this.isActive('/view') &&
//             !this.isActive('/health');
//     }

//     backToTopLevel(): void {
//         this.router.navigate(['../'], { relativeTo: this.route });
//     }

//     openGroup(group: GroupTile): void {
//         this.router.navigate(['systems', 'groups', group.id]);
//     }

//     openSystem(system: NxSystemWithUserInfo): void {
//         if (this.needToConfigureTwoFactor(system)) {
//             this.chosenSystemName = system.name;
//             this.show2faRequired = true;
//         } else {
//             this.updateEndpoint(system.id);
//             this.headerService.show$ = false;
//             this.uriService.updateURI(
//                 this.menusService.getUrl(system.id, this.endpoint)
//             ).then(() => {
//                 const activeSystem = this.headerService.activeSystem ||
//                     this.headerService.lastActive$.value ||
//                     this.tiles[0];
//                 this.menusService.updateActiveSystemMenu(activeSystem);
//             }).catch(err => { console.error(err); });
//         }
//     }

//     canShowTag(system: NxSystemWithUserInfo): boolean {
//         return system.stateOfHealth !== this.CONFIG.system.status.online &&
//             !!this.LANG.systemStatuses;
//     }

//     canShowButton(system: NxSystemWithUserInfo): boolean {
//         return this.LANG.system &&
//             system.stateOfHealth === this.CONFIG.system.status.online &&
//             !this.needToConfigureTwoFactor(system);
//     }

//     needToConfigureTwoFactor(system: NxSystemWithUserInfo): boolean {
//         return system.system2faEnabled && !this.account.account2faEnabled;
//     }

//     newGroup(): void {
//         this.dialogsService.createSystemGroup().then((res: GroupTile | undefined) => {
//             if (!res) {
//                 return;
//             }
//             this.groups.push(res);
//             let lastIndex = -1;
//             this.filteredTiles.forEach((item, index) => {
//                 if (item.type === 'group') {
//                     lastIndex = index;
//                 }
//             });
//             const { filteredTiles } = this;
//             filteredTiles.splice(lastIndex > -1 ? lastIndex + 1 : 0, 0, res);
//             this.filteredTiles = filteredTiles;
//         }, () => {
//             // Handle cancel
//         });
//     }

//     getTileIndex(id: string): number {
//         return this.filteredTiles.findIndex(tile => tile.id === id);
//     }

//     drop(event: CdkDragDrop<Tile>): void {
//         const previousTile: Tile = event.item.data; // Dragged tile
//         const currentTile = event.container.data; // Dropped onto tile
//         const previousIndex = this.getTileIndex(previousTile.id);
//         let currentIndex = this.getTileIndex(currentTile.id);
//         if (!event.isPointerOverContainer || currentTile.id === previousTile.id) {
//             return;
//         }
//         if (currentTile.type === 'group') {
//             this.filteredTiles.splice(previousIndex, 1);
//             if (previousIndex < currentIndex) {
//                 currentIndex += -1;
//             }
//             if (currentIndex >= this.filteredTiles.length) {
//                 currentIndex = this.filteredTiles.length - 1;
//             }

//             const targetGroupTile = this.filteredTiles[currentIndex] as GroupTile;
//             if (previousTile.type === 'system') {
//                 // Add system to group
//                 targetGroupTile.addSystem(previousTile);
//             } else {
//                 // Nest group inside another group
//                 targetGroupTile.addGroup(previousTile);
//             }
//             this.systemInGroup.add(previousTile.id);
//         }
//     }

//     ngOnDestroy(): void {}
// }
