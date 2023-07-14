import { Component, Inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { takeWhile } from 'rxjs/operators';

import { images } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { DOC_TYPES } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxHeaderService } from '@services/nx-header.service';
import { WINDOW } from '@services/window-provider';

import type { AboutNode } from '../about/about.component.types';
import { ErrorStateManager } from '../about/error-state/error-state-manager';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-dev-tools',
    templateUrl: 'dev-tools.component.html',
    styleUrls: ['dev-tools.component.scss'],
})
export class NxDevToolsComponent implements OnInit {
    @Input() devToolsNode: Partial<AboutNode>;
    @Input() title: string;

    CONFIG: IConfig = nxConfig;
    menuName = '';
    errorManager: ErrorStateManager;
    images = images;

    constructor(
        private cloudApi: NxCloudApiService,
        public headerService: NxHeaderService,
        private route: ActivatedRoute,
        @Inject(WINDOW) private window: Window,
    ) {
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        let snapshot = this.route.snapshot;
        while (!snapshot.paramMap.get('name')) {
            snapshot = snapshot.parent;
        }
        this.menuName = this.CONFIG.docMenuMap[snapshot.paramMap.get('name')]['dev-tools'];

        if (!this.devToolsNode) {
            const mapToDevToolsNode = ({
                name,
                subtitle,
                display_name: displayName,
                asset_id: assetId,
                new_window: newWindow,
                asset,
                url,
                icon,
                nodes,
            }): AboutNode => ({
                title: displayName || name || asset?.title,
                subtitle,
                displayName: displayName || name,
                nodes: nodes && nodes.map(mapToDevToolsNode),
                url: url || `/docs/content/${assetId}`,
                assetId,
                asset,
                icon,
                newWindow,
            });
            this.cloudApi
                .getDocumentation(this.menuName, DOC_TYPES.struct)
                .pipe(takeWhile(_ => !this.devToolsNode))
                .subscribe(({ nodes: devTools }) => {
                    this.devToolsNode = {
                        nodes: devTools.map(mapToDevToolsNode),
                    };
                });
        } else {
            this.devToolsNode = {
                ...this.devToolsNode,
                nodes: this.devToolsNode.nodes.map(({ url, ...node }) => ({
                    ...node,
                    url: url || `/docs/content/${node.assetId}`,
                })),
            };
        }

        const devToolsConfig = this.errorManager.buildConfig(
            ['nodes'],
            this.errorManager.buildConfig(['title', 'url']),
        );
        if (this.devToolsNode) {
            this.errorManager.checkAboutNode(this.devToolsNode as AboutNode, devToolsConfig);
        }
    }
}
