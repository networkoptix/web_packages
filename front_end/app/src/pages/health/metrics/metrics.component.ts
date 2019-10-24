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
        this.route
            .params
            .subscribe((params: any) => {
                this.metricId = params.metric;
                this.menuService.setSection(this.metricId);
                this.selectedData = this.healthService.tableHeaders[this.metricId];
                this.selectedPanelData = this.healthService.panelParams[this.metricId];
                this.selectedValues = this.healthService.values[this.metricId];
                this.resetActiveEntity();
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
        this.activeEntity = entity;
    }

    resetActiveEntity() {
        this.activeEntity = undefined;
    }
}
