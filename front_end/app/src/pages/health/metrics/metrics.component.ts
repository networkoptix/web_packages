import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../../services/account.service';
import { NxConfigService } from '../../../services/nx-config';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxMenuService } from '../../../components/menu/menu.service';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';


@Component({
    selector   : 'nx-system-metrics-component',
    templateUrl: 'metrics.component.html',
    styleUrls  : ['metrics.component.scss']
})
export class NxSystemMetricsComponent implements OnInit {
    CONFIG: any;
    account: any;
    manifest: any;
    system: NxSystem;
    values: any;
    metricId: any;

    selectedData: any;
    selectedValues: any;

    menu: any;
    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService,
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.route.params.subscribe((params: any) => {
            this.metricId = params.metric;
            this.menuService.setSection(this.metricId);
            if (this.manifest && this.values) {
                this.selectedData = this.manifest[this.metricId];
                this.selectedValues = this.values[this.metricId];
            }
        });
        this.route.parent.params.subscribe((params: any) => {
            const systemId = params.systemId;
            this.accountService.get().then((account) => {
                this.account = account;
                this.system = this.systemService.createSystem(systemId, account.email);

                // TODO: Move/use service to not hit api multiple times
                this.system.getInfo().then(() => {
                    const manifest$ = this.system.mediaserver.getHealthManifest();
                    const values$ = this.system.mediaserver.getHealthValues();
                    combineLatest(manifest$, values$)
                        .pipe(map(([manifestRequest, valuesRequest]) => {
                            return {manifestRequest, valuesRequest};
                        }))
                        .subscribe((result: any) => {
                            this.manifest = result.manifestRequest.reply;
                            this.selectedData = this.manifest[this.metricId];
                            this.values = result.valuesRequest.reply;
                            this.selectedValues = this.values[this.metricId];
                        });
                });
            });
        });
    }
}
