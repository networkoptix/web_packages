import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTreeModule, NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxStepperComponent } from '@components/stepper/stepper.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ExplorerNode } from '@services/nx-cloud-api/nx-cloud-api.types';
import { icons } from '@static-variables';

import { FirstPartyWidget } from '../helper-classes';

interface AssetTypeInterface {
    name: string;
    id: string;
    value: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-asset-explorer-widget',
    templateUrl: './asset-explorer-widget.component.html',
    styleUrls: ['./asset-explorer-widget.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkStepperModule,
        CdkTreeModule,
        NxCheckboxComponent,
        NxNumericComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxStepperComponent,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
    ],
})
export class NxAssetExplorerWidgetComponent extends FirstPartyWidget<
    typeof NxAssetExplorerWidgetComponent.BASE_CONFIG
> {
    static override IDENTIFIER = 'asset-explorer';
    static override NAME = 'Asset Explorer';
    static override SIZES = [
        { name: '2 x 4', value: { cols: 2, rows: 4 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } },
    ];

    static override BASE_CONFIG = {
        assetTypes: [
            { name: 'Agreements', id: 'agreement', value: true },
            { name: 'Custom Clients', id: 'custom_clients', value: true },
            { name: 'Documentation', id: 'documentation', value: true },
            { name: 'Integrations', id: 'integration', value: true },
            { name: 'VMS', id: 'vms', value: true },
        ],
        maxAge: 60,
        showAdmin: true,
        showPreviews: true,
    };

    AssetTypeInterface: AssetTypeInterface;

    ACTION_ICONS = {
        preview: '🖥️',
        settings: '⚙️',
        download: '💾',
    };

    LANG = staticLang;
    loading = true;
    treeControl = new NestedTreeControl<ExplorerNode>(node => node.children);
    dataSource$: Observable<{ last: string; data: ExplorerNode[] }>;
    hasChild = (_: number, node: ExplorerNode): boolean =>
        !!node.children && node.children.length > 0;

    updater$ = new BehaviorSubject<number>(null);

    icons = icons;

    refreshData(): void {
        this.loading = true;
        this.updater$.next(0);
    }

    constructor(cd: ChangeDetectorRef, private cloudApi: NxCloudApiService) {
        super(cd);
        this.dataSource$ = this.updater$.pipe(
            map(maxAge => (maxAge === null ? this.card.config.maxAge : maxAge)),
            switchMap(maxAge => {
                const type = this.card.config.assetTypes
                    .filter(({ value }) => value)
                    .map(({ id }) => id);
                const admin = this.card.config.showAdmin ? type : [];
                const preview = this.card.config.showPreviews ? type : [];
                return this.cloudApi.getAssets(maxAge, { type, admin, preview });
            }),
            map(({ last, data }) => {
                this.loading = false;
                return {
                    last: new Date(last).toLocaleString(),
                    data,
                };
            }),
            shareReplay({
                bufferSize: 1,
                refCount: true,
            }),
        );
    }
}

NxAssetExplorerWidgetComponent.registerWidget();
