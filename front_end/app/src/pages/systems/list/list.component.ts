import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Location }                  from '@angular/common';
import {
    Component, OnDestroy, OnInit
}                                    from '@angular/core';
import { Router }                    from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subject, Subscription }     from 'rxjs';
import { debounceTime }              from 'rxjs/operators';

import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxModalGenericComponent }   from '@dialogs/generic/generic.component';
import { NxAccountService, Account } from '@services/account.service';
import { NxMenusService }            from '@services/menus.service';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxHeaderService }           from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService }             from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUriService }              from '@services/uri.service';
import { NxUtilsService }            from '@services/utils.service';

interface SystemGroup {
    id: string;
    name: string;
    groups: SystemGroup[];
    systems: NxSystemWithUserInfo[];
    type: string;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['../../../components/systems-list/list.component.scss']
})

export class NxSystemGroupsListComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    groups: any = [
        {
            id: '1',
            name: 'Test',
            groups: [],
            systems: [],
            type: 'group'
        }, {
            id: '2',
            name: 'Test 2',
            groups: [],
            systems: [],
            type: 'group'
        }];

    systemInGroup = new Set<string>();
    dropLists: any[];

    showSearch;
    fetchComplete;
    search;
    gettingSystems: Process;
    openClient;
    systems;
    filteredSystems: any[];
    account: Account;
    endpoint: any = {};
    userEmail: string;
    searchChanged = new Subject();
    chosenSystemName: string;
    show2faRequired = false;
    private searchSubscription: Subscription;
    private systemSubscription: Subscription;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems?.();
    }

    constructor(
        configService: NxConfigService,
        private utilsService: NxUtilsService,
        private language: NxLanguageProviderService,
        private genericModal: NxModalGenericComponent,
        private pageService: NxPageService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private dialogsService: NxDialogsService,
        private router: Router,
        private location: Location
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        this.showSearch = false;
        this.fetchComplete = false;
        this.search = { value: '' };

        this.accountService.get()
            .then((account) => {
                if (account?.email) {
                    this.account = account;
                    this.userEmail = account.email;
                    this.systemsService.getSystems(account.email);
                }
            });

        this.systemSubscription = this.systemsService.systemsSubject.subscribe((systems) => {
            this.systems = systems;
            if (this.systems === undefined) {
                return;
            }

            this.systems.map((system) => {
                // avoid html being interpreted
                system.type = 'system';
                system.name = NxUtilsService.htmlToEntity(system.name);
            });
            this.systems = [...this.groups, ...this.systems];

            if (this.location.path().indexOf('/systems') === 0) {
                if (this.systems.length === 1) {
                    this.openSystem(this.systems[0]);
                }

                this.showSearch = this.systems.length >= this.CONFIG.search.minSystems;

                this.searchSystems();
            }
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
                this.searchSystems();
            });
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    getSystemOwnerName(system, currentEmail) {
        return this.systemsService.getSystemOwnerName(system, currentEmail);
    }

    hasMatch(str, search) {
        return str.toLowerCase().indexOf(search.toLowerCase()) >= 0;
    }

    searchSystems() {
        const search = this.search.value;

        if (search) {
            this.filteredSystems = this.systems
                .filter(({ id }) => !this.systemInGroup.has(id))
                .filter((system) => {
                    return !search ||
                            this.hasMatch(this.LANG.system.mySystemSearch?.(), search) && (system.ownerAccountEmail === this.accountService.email) ||
                            this.hasMatch(system.name, search) ||
                            this.hasMatch(system.ownerFullName, search) ||
                            this.hasMatch(system.ownerAccountEmail, search);
                });
        } else {
            this.filteredSystems = this.systems.filter(({ id }) => !this.systemInGroup.has(id));
        }
    }

    setSearch(value) {
        this.search.value = value;
        this.searchChanged.next();
    }

    private isActive(val: string) {
        return this.router.url.indexOf(val) >= 0;
    }

    updateEndpoint(id: string) {
        this.endpoint.ipvd = this.isActive('/ipvd');
        this.endpoint.integrations = this.isActive('/integrations');
        this.endpoint.register = this.isActive('/register');
        this.endpoint.view = this.isActive('/view');
        this.endpoint.information = this.isActive('/health');
        this.endpoint.settings = id && this.isActive('/systems') && !this.isActive('/view') && !this.isActive('/health');
    }

    openSystem(system) {
        return;
        if (this.needToConfigureTwoFactor(system)) {
            this.chosenSystemName = system.name;
            this.show2faRequired = true;
        } else {
            this.updateEndpoint(system.id);
            this.headerService.show$ = false;
            this.uriService.updateURI(this.menusService.getUrl(system.id, this.endpoint))
                .then(() => {
                    const activeSystem = this.headerService.activeSystem || this.headerService.lastActive$.value || this.systems[0];
                    this.menusService.updateActiveSystemMenu(activeSystem);
                })
                .catch(err => { console.error(err); });
        }
    }

    canShowTag(system) {
        return system.stateOfHealth !== this.CONFIG.system.status.online && this.LANG.systemStatuses;
    }

    canShowButton(system) {
        return this.LANG.system &&
            system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor(system);
    }

    needToConfigureTwoFactor(system) {
        return system.system2faEnabled && !this.account.account2faEnabled;
    }

    addGroup() {
        console.log(this.filteredSystems);
        this.dialogsService.createSystemGroup().then((res: SystemGroup) => {
            this.groups.push(res);
            let lastIndex = -1;
            this.filteredSystems.forEach((item, index) => {
                if (item.type === 'group') {
                    lastIndex = index;
                }
            });
            const filteredSystems = this.filteredSystems;
            filteredSystems.splice(lastIndex > -1 ? lastIndex + 1 : 0, 0, res);
            this.filteredSystems = filteredSystems;
        }, () => {
            // Handle cancel
        });
    }

    drop(event: CdkDragDrop<any>) {
        const getIndex = (id) => this.filteredSystems.findIndex((tile) => tile.id === id);
        const previousTile: any = event.item.data;
        const currentTile = event.container.data;
        const previousIndex = getIndex(previousTile.id);
        let currentIndex = getIndex(currentTile.id);
        if (!event.isPointerOverContainer || currentTile.id === previousTile.id) {
            return;
        }
        if (currentTile.type === 'group') {
            this.filteredSystems.splice(previousIndex, 1);
            if (previousIndex < currentIndex) {
                currentIndex += -1;
            }
            if (currentIndex >= this.filteredSystems.length) {
                currentIndex = this.filteredSystems.length - 1;
            }

            if (previousTile.type === 'system') {
                this.filteredSystems[currentIndex].systems.push(currentTile);
            } else {
                this.filteredSystems[currentIndex].groups.push(currentTile);
            }
            const groupIndex = this.groups.findIndex((group) => group.id === currentTile.id);
            this.groups[groupIndex] = { ...this.filteredSystems[currentIndex] };
            this.systemInGroup.add(previousTile.id);
        }
    }

    ngOnDestroy(): void {}
}
