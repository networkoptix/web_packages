import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../../services/account.service';
import { NxConfigService } from '../../../services/nx-config';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxMenuService } from '../../../components/menu/menu.service';


@Component({
    selector   : 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls  : ['alerts.component.scss']
})
export class NxSystemAlertsComponent implements OnInit {
    CONFIG: any;
    account: any;
    manifest: any;
    system: NxSystem;
    values: any;

    selectedData: any;

    menu: any;
    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        // this.route.params.subscribe((params: any) => {
        //     const systemId = params.systemId;
        //     this.accountService.get().then((account) => {
        //         this.account = account;
        //         this.system = this.systemService.createSystem(systemId, account.email);
        //         this.menu.base = `${this.CONFIG.systemHealthMenu.baseUrl}${this.system.id}`;
        //
        //         this.system.getInfo().then(() => {
        //             const manifest$ = this.system.mediaserver.getHealthManifest();
        //             const values$ = this.system.mediaserver.getHealthValues();
        //             manifest$.subscribe(request => {
        //                 this.manifest = request.reply;
        //                 const menu = {...this.menu};
        //                 Object.keys(this.manifest).forEach((asset) => {
        //                     menu.level1.push({
        //                         id: asset,
        //                         label: asset
        //                     });
        //                 });
        //
        //                 this.menu = {...menu};
        //                 this.selectedData = this.manifest.cameras[0];
        //             });
        //             values$.subscribe(request => {
        //                 this.values = request.reply;
        //             });
        //         });
        //     });
        // });
    }
}
