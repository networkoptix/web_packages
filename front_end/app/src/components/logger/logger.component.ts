import { HttpParams } from '@angular/common/http';
import { Component, Inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service';
import { WINDOW } from '@services/window-provider';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

@UntilDestroy()
@Component({
    selector: 'logger',
    templateUrl: './logger.component.html',
})
export class NxLoggerComponent implements OnChanges {
    private readonly relayUrl: string;
    readonly iframeHeight = 500;

    @Input() system: NxSystem;
    @Input() selectedServerId: string;
    @Input() noFrame = false;
    @Input() refreshInterval = 0;

    selectedLogLevel: DropdownItem<string>;
    logLevels: DropdownItem<string>[] = [];
    logUrl: string;
    logData: string;

    systemRequires2fa = false;
    cancel$ = new Subject()

    constructor(
        config: NxConfigService,
        @Inject(WINDOW) private window: Window) {
        this.relayUrl = config.getConfig().trafficRelayHost;
    }

    async getLogs(logger: DropdownItem<string>) {
        this.cancel$.next('cancel');
        let params = new HttpParams({ fromObject: { name: logger.value, lines: '1000' } });
        const { host, protocol } = this.window.location;
        let loggerHost = host;
        if (!environment.isLocal) {
            const { authGet } = this.system.mediaserver.getAuthKeys();
            if (!this.system.useRest && authGet) {
                params = params.set('auth', authGet);
            }
            loggerHost = this.relayUrl.replace('{systemId}', this.system.id);
        }
        if (!this.systemRequires2fa) {
            this.logUrl = `${protocol}//${loggerHost}/web/api/showLog?${params.toString()}`;
        }

        const handleLogResponse = (logData: string) => {
            this.logData = logData;
        };
        const update = () => this.system.mediaserver.logUrl({ name: logger.value, lines: 1000 })
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
        if (changes.system.currentValue) {
            if (!environment.isLocal) {
                this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]?.system2faEnabled;
            }
            this.system.serverManager.logLevel(this.selectedServerId)
                .pipe(untilDestroyed(this))
                .subscribe(res => {
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
