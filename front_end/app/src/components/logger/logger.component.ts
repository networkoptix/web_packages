import { HttpParams } from '@angular/common/http';
import { Component, Inject, Input, OnChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

type LoggerDropdownItem = DropdownItem<string>;

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

    selectedLogLevel: LoggerDropdownItem;
    logLevels: LoggerDropdownItem[] = [];
    logUrl: string;
    logData: string;

    systemRequires2fa = false;

    constructor(
        config: NxConfigService,
        @Inject(WINDOW) private window: Window) {
        this.relayUrl = config.getConfig().trafficRelayHost;
    }

    async getLogs(logger: LoggerDropdownItem): Promise<void> {
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
        this.system.mediaserver.logUrl({ name: logger.value, lines: 1000 })
            .then(handleLogResponse, ({ error }) => handleLogResponse(error));
    }

    async ngOnChanges(changes: NgChanges<{ system: NxSystem, selectedServerId: string }>): Promise<void> {
        if (changes.system.currentValue) {
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
