import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { DomSanitizer }                         from '@angular/platform-browser';
import { NxConfigService }                      from '../../../services/nx-config';
import { NxLanguageProviderService }            from '../../../services/nx-language-provider';
import { TranslateService }                     from '@ngx-translate/core';
import { timer }                                from 'rxjs';

import { NxPageService }    from '../../../services/page.service';
import { NxDialogsService } from '../../../dialogs/dialogs.service';

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

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.systems);

                this.gettingSystems = this.process.init(() => {
                    this.fetchComplete = true;
                    return this.systemsProvider.forceUpdateSystems();
                }, {
                    errorPrefix    : this.LANG.errorCodes.cantGetSystemsListPrefix,
                    logoutForbidden: true
                });
            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                @Inject('process') private process: any,
                @Inject('systemsProvider') private systemsProvider: any,
                @Inject('urlProtocol') private urlProtocol: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private translate: TranslateService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.CONFIG = this.configService.getConfig();
        this.showSearch = false;
        this.fetchComplete = false;
        this.search = { value: '' };

        this.authorizationService
            .requireLogin()
            .then((newAccount) => {
                this.account = newAccount;
                this.gettingSystems.run();
            });

        this.checkSystems = timer(0, 500).subscribe(() => {
            this.systems = this.systemsProvider.systems;

            if (this.systems.length === 1) {
                this.openSystem(this.systems[0]);
            }

            this.showSearch = this.systems.length >= this.CONFIG.minSystemsToSearch;

            this.searchSystems();
        });

        this.openClient = this.process.init(() => {
            console.log('systemSelected ->', this.systemSelected);
            return this.urlProtocol
                       .open(this.systemSelected && this.systemSelected.id)
                       .then(() => {
                               },
                               () => {
                                   // this.dialogs.noClientDetected();
                                   return true;
                               });
        }, {});
    }

    getSystemOwnerName(system, currentEmail) {
        return this.systemsProvider.getSystemOwnerName(system, currentEmail);
    }

    hasMatch(str, search) {
        return str.toLowerCase().indexOf(search.toLowerCase()) >= 0;
    }

    searchSystems() {
        const search = this.search.value;

        if (search) {
            this.filteredSystems = this.systems.filter((system) => {
                return !search ||
                        this.hasMatch(this.LANG.system.mySystemSearch, search) && (system.ownerAccountEmail === this.account.email) ||
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
        this.checkSystems.unsubscribe();
    }

}

