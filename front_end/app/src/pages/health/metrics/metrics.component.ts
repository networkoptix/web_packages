import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService }          from '../../../services/account.service';
import { NxConfigService }           from '../../../services/nx-config';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxMenuService }             from '../../../components/menu/menu.service';
import { combineLatest }             from 'rxjs';
import { map, concatMap }            from 'rxjs/operators';
import { NxHealthService }           from '../health.service';
import { NxUriService }              from '../../../services/uri.service';

interface Params {
    [key: string]: any;
}

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
    params: any  = {};

    manifest: any;
    values: any;
    alarms: any;

    selectedData: any;
    selectedPanelData: any;
    selectedValues: any;

    menu: any;
    activeEntity: any;

    multiEntity = true;
    objectKeys = Object.keys;
    objectValues = Object.values;

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService,
                private healthService: NxHealthService,
                private uri: NxUriService,
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        let idParam = this.route.snapshot.queryParamMap.get('id');
        this.route
            .params
            .subscribe((params: any) => {
                this.multiEntity = true;
                if (this.metricId) {
                    const queryParams: Params = {};
                    queryParams.id = undefined;
                    this.uri.updateURI(this.uri.getURL(), queryParams);
                }
                this.metricId = params.metric;
                this.menuService.setSection(this.metricId);
                this.selectedData = this.healthService.tableHeaders[this.metricId];
                this.selectedPanelData = this.healthService.panelParams[this.metricId];
                this.selectedValues = this.healthService.values[this.metricId];
                this.resetActiveEntity();
                if (Object.keys(this.selectedValues).length === 1) {
                    this.multiEntity = false;
                }

                if (idParam) {
                    this.setActiveEntity(idParam);
                    this.params.id = idParam;
                    idParam = undefined;
                } else {
                    this.params.id = undefined;
                }
            });

        // combineLatest(this.healthService.manifestSubject, this.healthService.valuesSubject, this.healthService.alarmsSubject).subscribe(
        //     ([manifest, values, alarms]) => {
        //         if (manifest && values && alarms) {
        //             this.manifest = manifest;
        //             this.values = values;
        //             this.alarms = alarms;
        //             this.selectedData = this.healthService.tableHeaders[this.metricId];
        //             this.selectedPanelData = this.healthService.panelParams[this.metricId];
        //             this.selectedValues = this.values[this.metricId];
        //         }
        //     }
        // );
    }

    setActiveEntity(entity) {
        const queryParams: Params = {};
        if (typeof entity === 'string') {
            this.activeEntity = this.selectedValues[entity];
            if (!this.activeEntity) {
                queryParams.id = undefined;
                this.uri.updateURI(this.uri.getURL(), queryParams);
            }
        } else {
            this.activeEntity = entity;
            queryParams.id = entity.id;
            this.uri.updateURI(this.uri.getURL(), queryParams);
        }
    }

    resetActiveEntity() {
        this.activeEntity = undefined;
    }
}
