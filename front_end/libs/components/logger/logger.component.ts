import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, Inject, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { Subject, firstValueFrom, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { cleanId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

type LoggerDropdownItem = DropdownItem<string>;

@UntilDestroy()
@Component({
    selector: 'nx-logger',
    templateUrl: './logger.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxGenericDropdownModule,
        NxPreLoaderComponent,
        NxSectionPlaceholderComponent,
    ],
})
export class NxLoggerComponent implements OnChanges {
    private readonly relayUrl: string;
    readonly iframeHeight = 500;
    LANG = staticLang;

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
        private cookieService: CookieService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.relayUrl = config.getConfig().trafficRelayHost;
    }

    async getLogs(logger: LoggerDropdownItem): Promise<void> {
        this.cancel$.next('cancel');
        let params = new HttpParams({ fromObject: { name: logger.value, lines: '1000' } });
        const { host, protocol } = this.window.location;
        let loggerHost = host;

        if (!environment.isLocal) {
            this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]
                ?.system2faEnabled;

            if (!this.systemRequires2fa) {
                const { authGet } = this.system.mediaserver.getAuthKeys();
                if (authGet) {
                    params = params.set('auth', authGet);
                }
                loggerHost = this.relayUrl.replace(
                    '{systemId}',
                    `${cleanId(this.selectedServerId)}.${this.system.id}`,
                );
                const localProxy = this.cookieService.get('cors_bypass') || '';
                this.logUrl = `${localProxy}${protocol}//${loggerHost}/web/api/showLog?${params.toString()}`;
            }
        }

        const handleLogResponse = (logData: string) => {
            this.logData = logData;
        };

        const update = () =>
            this.system.serverManager
                .getLogs(this.selectedServerId, { name: logger.value, lines: 1000 })
                .then(handleLogResponse, ({ error }) => handleLogResponse(error));

        if (this.refreshInterval) {
            timer(0, this.refreshInterval)
                .pipe(untilDestroyed(this), takeUntil(this.cancel$))
                .subscribe(update);
        } else {
            update();
        }
    }

    async ngOnChanges(changes: NgChanges<NxLoggerComponent>): Promise<void> {
        if (changes.system?.currentValue || changes.selectedServerId?.currentValue) {
            if (this.selectedServerId) {
                this.logData = '';
                if (!environment.isLocal) {
                    this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]
                        ?.system2faEnabled;
                }
                // Initialize Server Manager if it is not already
                if (!this.system.serverManager.servers.length) {
                    await firstValueFrom(this.system.serverManager.getServers());
                }
                this.system.serverManager.logLevel(this.selectedServerId).then(res => {
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
