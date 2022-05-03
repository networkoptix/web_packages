import { NestedTreeControl } from '@angular/cdk/tree'; import { ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { ExplorerNode } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { FirstPartyWidget } from '../helper-classes';

interface AssetTypeInterface {
    name: string,
    id: string,
    value: boolean
}

@UntilDestroy()
@Component({
    selector: 'nx-asset-explorer-widget',
    templateUrl: './asset-explorer-widget.component.html',
    styleUrls: ['./asset-explorer-widget.component.scss']
})
export class NxAssetExplorerWidgetComponent extends FirstPartyWidget {
    static IDENTIFIER = 'asset-explorer';
    static NAME = 'Asset Explorer';
    static SIZES = [
        { name: '2 x 4', value: { cols: 2, rows: 4 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } }
    ];

    static BASE_CONFIG = {
        assetTypes: [
            { name: 'Agreements', id: 'agreement', value: true },
            { name: 'Custom Clients', id: 'custom_clients', value: true },
            { name: 'Documentation', id: 'documentation', value: true },
            { name: 'Integrations', id: 'integration', value: true },
            { name: 'VMS', id: 'vms', value: true }
        ],
        maxAge: 60,
        showAdmin: true,
        showPreviews: true
    };

    AssetTypeInterface: AssetTypeInterface;

    ACTION_ICONS = {
        preview: '🖥️',
        settings: '⚙️',
        download: '💾'
    };

    CONFIG: IConfig;
    loading = true;
    treeControl = new NestedTreeControl<ExplorerNode>(node => node.children);
    dataSource$: Observable<{ last: string, data: ExplorerNode[] }>;
    hasChild = (_: number, node: ExplorerNode) => !!node.children && node.children.length > 0;

    updater$ = new BehaviorSubject(null);

    refreshData(): void {
        this.loading = true;
        this.updater$.next(0);
    }

    constructor(
        cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        configService: NxConfigService
    ) {
        super(cd);
        this.CONFIG = configService.config;
        this.dataSource$ = this.updater$.pipe(
            map(maxAge => maxAge === null ? this.card.config.maxAge : maxAge),
            switchMap(maxAge => {
                const type = this.card.config.assetTypes.filter(({ value }) => value).map(({ id }) => id);
                const admin = this.card.config.showAdmin ? type : [];
                const preview = this.card.config.showPreviews ? type : [];
                return this.cloudApi.getAssets(maxAge, { type, admin, preview });
            }),
            map(({ last, data }) => {
                this.loading = false;
                return {
                    last: new Date(last).toLocaleString(),
                    data
                };
            }),
            shareReplay()
        );
    }
}

NxAssetExplorerWidgetComponent.registerWidget();
