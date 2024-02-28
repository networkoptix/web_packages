import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { SystemCardComponent } from '@components/system-card/system-card.component';
import { NxTagComponent } from '@components/tag/tag.component';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxMenusService } from '@services/menus.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NxUriService } from '@services/uri.service';
import { search } from '@static-variables';
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
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxFooterComponent,
        NxNoSystemsComponent,
        NxPreLoaderComponent,
        SystemCardComponent,
        NxSearchComponent,
        NxTagComponent,
    ],
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
    searchChanged = new Subject<void>();
    showList: boolean = false;

    @Input({ transform: booleanAttribute }) atBase: boolean = true;
    @Input() size: 'full' | 'mid' | 'compact';
    @Input({ transform: booleanAttribute }) disableSearch: boolean;
    @Input() systemsToShow: string[];
    @Input() linkHandler: Function;
    @Input({ transform: booleanAttribute }) enableRedirect: boolean = false;

    @Output() availableSystems = new EventEmitter<NxSystemInfo[]>();

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
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.size = this.size ?? 'full';
        this.disableSearch = this.disableSearch ?? false;
        this.showSearch = false;
        this.fetchComplete = false;

        this.accountService.get(true).then(account => {
            if (account?.email) {
                this.account = account;
            }

            this.systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
                if (this.systemsToShow?.length) {
                    systems = systems.filter(({ id }) => this.systemsToShow.includes(id));
                }

                this.systems = systems;
                this.availableSystems.emit(systems);
                if (this.systems === undefined) {
                    return;
                }

                if (this.systems.length === 1 && this.enableRedirect) {
                    // Even we can open offline system for viewing sometimes connection to the system cannot be
                    // established, and we'll get into a loop. It's safer not to open the system.
                    const [system] = this.systems;
                    if (!system.system2faEnabled || account.sessionVerified) {
                        this.openSystem(system);
                    } else {
                        this.showList = true;
                        this.searchSystems();
                    }
                } else {
                    this.showList = true;
                    this.showSearch = this.systems.length >= search.minSystems;
                    this.searchSystems();
                }
            });
        });

        this.gettingSystems = this.processService.createProcess(
            () => {
                this.fetchComplete = true;
                return firstValueFrom(this.systemsService.forceUpdateSystems());
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
                const ownerText = this.systemsService.getSystemOwnerName(system);
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

        if (id) {
            this.endpoint.settings =
                this.isActive('/systems') && !this.isActive('/view') && !this.isActive('/health');
        }
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
