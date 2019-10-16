import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../../services/account.service';
import { NxConfigService } from '../../../services/nx-config';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxMenuService } from '../../../components/menu/menu.service';
import { combineLatest } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { NxHealthService } from '../health.service';


@Component({
    selector   : 'nx-system-metrics-component',
    templateUrl: 'metrics.component.html',
    styleUrls  : ['metrics.component.scss']
})
export class NxSystemMetricsComponent implements OnInit {
    CONFIG: any;
    account: any;

    system: NxSystem;
    metricId: any;

    manifest: any;
    values: any;
    alarms: any;

    tableHeaders: any;
    panelParams: any;

    selectedData: any;
    selectedPanelData: any;
    selectedValues: any;

    menu: any;
    activeEntity: any;

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService,
                private healthService: NxHealthService,
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.route.params.subscribe((params: any) => {
            this.metricId = params.metric;
            this.menuService.setSection(this.metricId);
            if (this.manifest && this.values) {
                this.selectedData = this.tableHeaders[this.metricId];
                this.selectedPanelData = this.panelParams[this.metricId];
                this.selectedValues = this.values[this.metricId];
            }
            this.resetActiveEntity();
        });

        combineLatest(this.healthService.manifestSubject, this.healthService.valuesSubject, this.healthService.alarmsSubject).subscribe(
            ([manifest, values, alarms]) => {
                if (manifest && values && alarms) {
                    this.manifest = manifest;
                    this.values = values;
                    this.alarms = alarms;
                    this.initializeHeaders();
                    this.selectedData = this.tableHeaders[this.metricId];
                    this.selectedPanelData = this.panelParams[this.metricId];
                    this.selectedValues = this.values[this.metricId];
                }
            }
        );
    }

    initializeHeaders() {
        this.tableHeaders = this.filterManifestHeaders('table');
        this.panelParams = this.filterManifestHeaders('panel');
    }

    filterManifestHeaders(displayFilter: string) {
        const headers = {};
        Object.keys(this.manifest).forEach((metricId) => {
            headers[metricId] = {};
            this.manifest[metricId].forEach((headerGroup) => {
                const group = headerGroup.values.filter((header) => {
                    return header.display.includes(displayFilter);
                });
                if (group.length) {
                    headers[metricId][headerGroup.id] = group;
                }
            });
        });
        return headers;
    }

    setActiveEntity(entity) {
        this.activeEntity = entity;
    }

    resetActiveEntity() {
        this.activeEntity = undefined;
    }
}
