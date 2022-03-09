import { HttpParams } from '@angular/common/http';
import { AfterViewInit, Component, Inject, Input } from '@angular/core';

import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config';
import { NxSystem } from '@services/system.service';
import { WINDOW } from '@services/window-provider';

import { DropdownItem } from '../dropdowns/generic/dropdown.component.types';

@Component({
    selector: 'logger',
    templateUrl: './logger.component.html',
})
export class NxLoggerComponent implements AfterViewInit {
    private readonly relayUrl: string;
    readonly iframeHeight = 500;

    @Input() system: NxSystem;

    selectedLogLevel: DropdownItem<string>;
    logLevels: DropdownItem<string>[] = [];
    logUrl: string;
    logData: string;

    systemRequires2fa = false;

    constructor(
        config: NxConfigService,
        @Inject(WINDOW) private window: Window) {
        this.relayUrl = config.getConfig().trafficRelayHost;
    }

    async getLogs(logger: DropdownItem<string>) {
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

    async ngAfterViewInit() {
        if (!environment.isLocal) {
            this.systemRequires2fa = (await this.system.getInfoFromCloudDb().toPromise())[0]?.system2faEnabled;
        }
        this.system.mediaserver.logLevel().subscribe(res => {
            this.logLevels = Object.keys(res.reply).map(level => new DropdownItem<string>(level, undefined, level));
            this.selectedLogLevel = new DropdownItem<string>('MAIN', undefined, 'MAIN');
            this.getLogs(this.selectedLogLevel);
        });
    }
}
