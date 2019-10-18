import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../services/account.service';
import { NxConfigService } from '../../services/nx-config';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxMenuService } from '../../components/menu/menu.service';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { NxHealthService } from './health.service';


@Component({
    selector   : 'nx-system-health-component',
    templateUrl: 'health.component.html',
    styleUrls  : ['health.component.scss']
})
export class NxHealthComponent implements OnInit {
    CONFIG: any;
    account: any;
    system: NxSystem;

    menu: any;
    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuservice: NxMenuService,
                private healthService: NxHealthService
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.menu = {
            selectedSection   : '',         // updated by selectedSectionSubject
            base              : `${this.CONFIG.systemMenu.baseUrl}${this.system && this.system.id || ''}${this.CONFIG.systemHealthMenu.baseUrl}`,
            level1            : [
                {
                    id: 'alerts',
                    label: 'Alerts',
                    path: 'alerts'
                }
            ]
        };

        this.menuservice.selectedSectionSubject.subscribe(selection => {
            this.menu.selectedSection = selection;
            this.menu = {...this.menu}; // trigger onChange
        });

        this.route.params.subscribe((params: any) => {
            const systemId = params.systemId;
            this.accountService.get().then((account) => {
                this.account = account;
                this.system = this.systemService.createSystem(systemId, account.email);
                this.menu.base = `${this.CONFIG.systemMenu.baseUrl}${this.system.id}${this.CONFIG.systemHealthMenu.baseUrl}`;

                this.system.getInfo().then(() => {
                    const manifest$ = this.system.mediaserver.getHealthManifest();
                    const values$ = this.system.mediaserver.getHealthValues();
                    const alarms$ = this.system.mediaserver.getHealthAlarms();
                    combineLatest(manifest$, values$, alarms$)
                        .pipe(map(([manifestRequest, valuesRequest, alarmsRequest]) => {
                            return {manifestRequest, valuesRequest, alarmsRequest};
                        }))
                        .subscribe((result: any) => {
                            this.healthService.manifest = result.manifestRequest.reply;
                            this.healthService.values = result.valuesRequest.reply;
                            this.healthService.alarms = result.alarmsRequest.reply;

                            this.initializeManifest();
                            this.initializeHeaders();
                            const menu = {...this.menu};
                            Object.keys(this.healthService.manifest).forEach((asset) => {
                                menu.level1.push({
                                    id: asset,
                                    label: this.toCapitalizedWords(asset),
                                    path: asset
                                });
                            });
                            this.menu = {...menu};
                            this.healthService.ready = true;
                        });
                });
            });
        });
    }

    initializeManifest() {
        const manifest = {};
        this.healthService.manifest.forEach(metric => {
            manifest[metric.id] = metric;
        });
        this.healthService.manifest = manifest;
    }

    initializeHeaders() {
        this.healthService.tableHeaders = this.filterManifestHeaders('table');
        this.healthService.panelParams = this.filterManifestHeaders('panel');
    }

    filterManifestHeaders(displayFilter: string) {
        const headers = {};
        Object.keys(this.healthService.manifest).forEach((metricId) => {
            const metric = this.healthService.manifest[metricId];
            headers[metric.id] = metric;
            headers[metric.id].values.forEach((headerGroup, index) => {
                const group = headerGroup.values.filter((header) => {
                    return header.display.includes(displayFilter);
                });
                if (group.length) {
                    headers[metric.id].values[index].values = group;
                }
            });
        });
        return headers;
    }

    // Temporary camelCase converter
    toCapitalizedWords(name) {
        const words = name.match(/[A-Za-z][a-z]*/g) || [];
        return words.map(this.capitalize).join(' ');
    }

    capitalize(word) {
        return word.charAt(0).toUpperCase() + word.substring(1);
}
}
