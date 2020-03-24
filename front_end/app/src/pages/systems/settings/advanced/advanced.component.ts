import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy
}                                     from '@angular/core';
import {
    filter, map, delay,
    retryWhen, take
} from 'rxjs/operators';
import { Subscription, Observable }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { NxConfigService, IConfig }   from '../../../../services/nx-config';
import { NxDialogsService }           from '../../../../dialogs/dialogs.service';
import { NxSettingsService }          from '../settings.service';
import { NxLanguageProviderService }  from '../../../../services/nx-language-provider';
import { NxMenuService }              from '../../../../components/menu/menu.service';
import { NxProcessService }           from '../../../../services/process.service';
import { NxSystem }                   from '../../../../services/system.service';
import { NxApplyService, Watcher }    from '../../../../services/apply.service';
import { NxUriService }               from '../../../../services/uri.service';
import { AutoUnsubscribe }            from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }    from '../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-component',
    templateUrl : 'advanced.component.html',
    styleUrls   : ['advanced.component.scss']
})

export class NxSystemServerAdvancedComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    viewContainerRef: ViewContainerRef;
    serverIdFromParams: any;
    selectedServer: any;
    serverOffline: boolean;
    checking: boolean;
    parsedServerId: string;

    private routeParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private serverSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnInit(): void {
        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                    this.parsedServerId = params.serverId.replace(/\s|\{|\}/g, '');
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.system = system;

                if (this.serverSubscription) {
                    this.serverSubscription.unsubscribe();
                }
                this.serverSubscription = this.system.infoSubject
                    .pipe(
                        map(system => {
                            if (!system.servers || system.servers.length === 0) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .pipe(take(1))
                    .subscribe(() => {
                        this.settingsService.footerSubject.next(true);
                        if (this.system.currentServerNotBusy) {
                            if (!this.applyService.locked) {
                                this.setServer();
                            }
                        }
                    });
            });
    }

    ngOnDestroy(): void {
    }

    setServer(): void {
        if (this.system && this.system.servers && this.system.servers.length > 0) {
            let server;
            if (this.serverIdFromParams) {
                server = this.system.servers.find((server: any) => {
                    return server.id === this.serverIdFromParams;
                });
            }
            if (typeof server === 'undefined') {
                if (this.system.servers.length > 0) {
                    server = this.system.servers[0];

                    this.uriService
                        .updateURI(`systems/${this.system.id}/servers/${server.id}`)
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    return;
                }
            }

            server.osName = server.osInfo !== '' ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
            this.selectedServer = server;
            this.selectedServer.id = this.selectedServer.id.replace(/[\{\}]/g, '');
            this.menuService.setDetailsSection(this.selectedServer.id);
        }
    }
}
