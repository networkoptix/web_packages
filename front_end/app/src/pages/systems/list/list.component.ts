import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../services/nx-config';
import { NxLanguageProviderService }            from '../../../services/nx-language-provider';

import { NxPageService }    from '../../../services/page.service';
import { NxDialogsService } from '../../../dialogs/dialogs.service';
import { NxSystemsService } from '../../../services/systems.service';
import { NxAccountService } from '../../../services/account.service';

@Component({
    selector   : 'nx-systems-list-component',
    templateUrl: 'list.component.html',
    styleUrls  : ['list.component.scss']
})

export class NxSystemsListComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    location: any;
    showSearch: any;
    fetchComplete: any;
    search: any;
    gettingSystems: any;
    openClient: any;
    systems: any;
    filteredSystems: any;
    checkSystems: any;
    systemSelected: any;
    userEmail: string;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();

        this.pageService.setPageTitle(this.LANG.pageTitles.systems);
    }

    constructor(@Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                location: Location,
    ) {
        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.CONFIG = this.configService.getConfig();
        this.showSearch = false;
        this.fetchComplete = false;
        this.search = { value: '' };

        this.accountService
            .requireLogin()
            .then((account) => {
                this.userEmail = account.email;
                this.systemsService.getSystems(account.email);
            });

        this.systemsService.systemsSubject.subscribe((systems) => {
            this.systems = systems;
            if (this.systems === undefined) {
                return;
            }

            if (this.systems.length === 1) {
                this.openSystem(this.systems[0]);
            }

            this.showSearch = this.systems.length >= this.CONFIG.minSystemsToSearch;

            this.searchSystems();
        });

        this.openClient = this.process.init(() => {
            return this.urlProtocol
                       .open(this.systemSelected && this.systemSelected.id)
                       .then(() => {
                               },
                               () => {
                                   // this.dialogs.noClientDetected();
                                   return true;
                               });
        }, {});

        this.gettingSystems = this.process.init(() => {
            this.fetchComplete = true;
            return this.systemsService.forceUpdateSystems().subscribe(_ => {
            });
        }, {
            errorPrefix    : this.LANG.errorCodes.cantGetSystemsListPrefix,
            logoutForbidden: true
        });
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
            this.filteredSystems = this.systems.filter((system) => {
                return !search ||
                        this.hasMatch(this.LANG.system.mySystemSearch, search) && (system.ownerAccountEmail === this.accountService.getEmail()) ||
                        this.hasMatch(system.name, search) ||
                        this.hasMatch(system.ownerFullName, search) ||
                        this.hasMatch(system.ownerAccountEmail, search);
            });
        } else {
            this.filteredSystems = this.systems;
        }
    }

    openSystem(system) {
        this.location.go('/systems/' + system.id);
    }

    ngOnDestroy(): void {
        this.systemsService.stopPoll();
    }

}

