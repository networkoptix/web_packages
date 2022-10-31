import { HttpParams } from '@angular/common/http';
import { Component, Inject, Input, OnChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { cleanId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

type LoggerDropdownItem = DropdownItem<string>;

@UntilDestroy()
@Component({
    selector: 'nx-logger',
    templateUrl: './logger.component.html'
})
export class NxLoggerComponent implements OnChanges {
    private readonly relayUrl: string;
    readonly iframeHeight = 500;
    LANG: LanguageI18NStaticTypes;

    @Input() system: NxSystem;
    @Input() selectedServerId: string;
    @Input() noFrame = false;
    @Input() refreshInterval = 0;

    selectedLogLevel: LoggerDropdownItem;
    logLevels: LoggerDropdownItem[] = [];
    logUrl: string;
    logData: string;

    systemRequires2fa = false;
    cancel$ = new Subject();

    constructor(
        config: NxConfigService,
        languageService: NxLanguageProviderService,
        private cookieService: CookieService,
        @Inject(WINDOW) private window: Window
    ) {
        this.relayUrl = config.getConfig().trafficRelayHost;
        this.LANG = languageService.translations;
    }

    async getLogs(logger: LoggerDropdownItem): Promise<void> {
        this.cancel$.next('cancel');
        let params = new HttpParams({ fromObject: { name: logger.value, lines: '1000' } });
        const { host, protocol } = this.window.location;
        let loggerHost = host;

        if (!environment.isLocal) {
            this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]?.system2faEnabled;

            if (!this.systemRequires2fa) {
                const { authGet } = this.system.mediaserver.getAuthKeys();
                if (authGet) {
                    params = params.set('auth', authGet);
                }
                loggerHost = this.relayUrl.replace('{systemId}', `${cleanId(this.selectedServerId)}.${this.system.id}`);
                const localProxy = this.cookieService.get('cors_bypass') || '';
                this.logUrl = `${localProxy}${protocol}//${loggerHost}/web/api/showLog?${params.toString()}`;
            }
        }

        const handleLogResponse = (logData: string) => {
            this.logData = logData;
        };

        const update = () => this.system.serverManager
            .getLogs(this.selectedServerId, { name: logger.value, lines: 1000 })
            .then(handleLogResponse, ({ error }) => handleLogResponse(error));

        if (this.refreshInterval) {
            timer(0, this.refreshInterval).pipe(
                untilDestroyed(this),
                takeUntil(this.cancel$)
            ).subscribe(update);
        } else {
            update();
        }
    }

    async ngOnChanges(changes: NgChanges<NxLoggerComponent>): Promise<void> {
        if (changes.system.currentValue || changes.selectedServerId?.currentValue) {
            if (this.selectedServerId) {
                this.logData = '';
                if (!environment.isLocal) {
                    this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]?.system2faEnabled;
                }
                this.system.serverManager.logLevel(this.selectedServerId)
                    .then(res => {
                        this.logLevels = Object.keys(res.reply).map(level => ({
                            name: level,
                            value: level,
                        }));
                        this.selectedLogLevel = { name: 'MAIN', value: 'MAIN' };
                        this.getLogs(this.selectedLogLevel);
                    });
            }
        }
    }
}
