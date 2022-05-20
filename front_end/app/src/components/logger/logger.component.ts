import { HttpParams } from '@angular/common/http';
import { Component, Inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';
import { WINDOW } from '@services/window-provider';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

@UntilDestroy()
@Component({
    selector: 'logger',
    templateUrl: './logger.component.html'
})
export class NxLoggerComponent implements OnChanges {
    LANG: LanguageI18NStaticTypes;

    @Input() system: NxSystem;
    @Input() selectedServerId: string;
    @Input() noFrame = false;
    @Input() refreshInterval = 0;

    private readonly relayUrl: string;
    readonly iframeHeight = 500;
    selectedLogLevel: DropdownItem<string>;
    logLevels: DropdownItem<string>[] = [];
    logUrl: string;
    logData: string;

    systemRequires2fa = false;
    cancel$ = new Subject();

    constructor(
        config: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window
    ) {
        this.relayUrl = config.getConfig().trafficRelayHost;
        this.LANG = languageService.translations;
    }

    async getLogs(logger: DropdownItem<string>) {
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
                loggerHost = this.relayUrl.replace('{systemId}', `${NxUtilsService.cleanId(this.selectedServerId)}.${this.system.id}`);
                this.logUrl = `${protocol}//${loggerHost}/web/api/showLog?${params.toString()}`;
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
                takeUntil(this.cancel$),
                untilDestroyed(this)
            ).subscribe(update);
        } else {
            update();
        }
    }

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes.system?.currentValue || changes.selectedServerId?.currentValue) {
            if (this.selectedServerId) {
                this.logData = '';

                if (!environment.isLocal) {
                    this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]?.system2faEnabled;
                }

                this.system.serverManager.logLevel(this.selectedServerId).toPromise()
                    .then((res: any) => {
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
