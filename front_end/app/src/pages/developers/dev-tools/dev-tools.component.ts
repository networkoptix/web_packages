import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxAccountService } from '../../../services/account.service';
import { NxCloudApiService } from '../../../services/nx-cloud-api';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxHeaderService } from '../../../services/nx-header.service';
import { AboutNode } from '../about/about.component';
import { takeWhile } from 'rxjs/operators';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-dev-tools',
    templateUrl : 'dev-tools.component.html',
    styleUrls   : ['dev-tools.component.scss']
})
export class NxDevToolsComponent {
    @Input() devToolsNode: Partial<AboutNode>;
    @Input() title: string;

    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        public headerService: NxHeaderService,
        private accountService: NxAccountService,
        private router: Router
    ) {
        this.CONFIG = configService.config;
        if (!this.devToolsNode) {
            const mapToDevToolsNode = ({
                name,
                display_name: displayName,
                asset_id: assetId,
                new_window: newWindow,
                asset,
                url,
                icon,
                nodes
            }): AboutNode => ({
                title       : displayName || name || asset?.title,
                displayName : displayName || name,
                nodes       : nodes && nodes.map(mapToDevToolsNode),
                url         : url || `/developers/knowledge-base/${assetId}`,
                assetId,
                asset,
                icon,
                newWindow
            });
            this.cloudApi.getDocumentation('developer_tools')
                .pipe(takeWhile(_ => !this.devToolsNode))
                .subscribe(devTools => {
                    this.devToolsNode = {
                        nodes: devTools.map(mapToDevToolsNode)
                    };
                });
        }
    }
};
