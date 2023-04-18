import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { search } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxMenusService } from '@services/menus.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NxUriService } from '@services/uri.service';
import { caseInsenstiveSearch } from '@utils/general';

type Endpoint = Partial<{
    ipvd: boolean;
    integrations: boolean;
    register: boolean;
    view: boolean;
    information: boolean;
    settings: boolean;
}>;

@UntilDestroy()
@Component({
    selector: 'nx-systems-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['list.component.scss'],
})
export class NxSystemsListComponent implements OnInit {
    LANG = staticLang;
    showSearch: boolean;
    fetchComplete: boolean;
    search: { value: string };
    gettingSystems: Process;
    systems: NxSystemInfo[];
    filteredSystems: NxSystemInfo[];
    account: Account;
    endpoint: Endpoint = {};
    hasOneSystem: boolean;
    searchChanged = new Subject<void>();

    static SYSTEMS_BASE = '/systems';

    @Input() base: string = NxSystemsListComponent.SYSTEMS_BASE;
    @Input() size: 'full' | 'mid' | 'compact' = 'full';
    @Input() disableSearch = false;
    @Input() systemsToShow: string[];
    @Input() linkHandler: Function;

    @Output() availableSystems = new EventEmitter<NxSystemInfo[]>();

    get showCompact(): boolean {
        return this.base !== NxSystemsListComponent.SYSTEMS_BASE;
    }

    chosenSystemName: string;
    show2faRequired = false;

    private setupDefaults(): void {
        this.search = { value: '' };
    }

    constructor(
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private router: Router,
        private route: ActivatedRoute,
        private location: Location,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.showSearch = false;
        this.fetchComplete = false;

        this.accountService.get(true).then(account => {
            if (account?.email) {
                this.account = account;
                this.systemsService.getSystems(account.email);
            }

            this.systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
                this.systems = systems;
                this.availableSystems.emit(systems);
                if (this.systems === undefined) {
                    return;
                }

                this.hasOneSystem = this.systems.length === 1;

                if (this.location.path().startsWith(this.base)) {
                    // Even we can open offline system for viewing sometimes connection to the system cannot be
                    // established, and we'll get into a loop. It's safer not to open the system.
                    if (this.hasOneSystem) {
                        this.openSystem(this.systems[0]);
                    }

                    this.showSearch = this.systems.length >= search.minSystems;

                    this.searchSystems();
                }
            });
        });

        this.gettingSystems = this.processService.createProcess(
            () => {
                this.fetchComplete = true;
                return this.systemsService.forceUpdateSystems().toPromise();
            },
            {
                errorPrefix: this.LANG.errorCodes.cantGetSystemsListPrefix,
                logoutForbidden: true,
            },
        );

        this.searchChanged
            .pipe(debounceTime(search.debounceTime), untilDestroyed(this))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
    }

    trackItem(index: number, item: NxSystemInfo): string | undefined {
        return item?.id;
    }

    searchSystems(): void {
        const search = this.search.value;

        if (search) {
            this.filteredSystems = this.systems.filter(system => {
                const ownerText = this.systemsService.getSystemOwnerName(
                    system,
                    this.account.email,
                );
                return (
                    caseInsenstiveSearch(system.name, search) ||
                    (ownerText !== this.LANG.system.yourSystem &&
                        caseInsenstiveSearch(ownerText, search))
                );
            });
        } else {
            this.filteredSystems = this.systems;
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
        this.endpoint.register = this.isActive('/authorize/register');
        this.endpoint.view = this.isActive('/view');
        this.endpoint.information = this.isActive('/health');
        this.endpoint.settings =
            id && this.isActive('/systems') && !this.isActive('/view') && !this.isActive('/health');
    }

    openSystem = (system: NxSystemInfo): void => {
        if (this.linkHandler) {
            this.linkHandler({
                url: this.menusService.getUrl(system.id, this.endpoint),
                label: system.name,
            });
        } else {
            this.updateEndpoint(system.id);
            this.headerService.show$ = false;
            this.uriService
                .updateURI(this.menusService.getUrl(system.id, this.endpoint), {
                    search: undefined,
                })
                .catch(err => {
                    console.error(err);
                });
        }
    };
}
