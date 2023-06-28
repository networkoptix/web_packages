import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxFileDropModule } from 'ngx-file-drop';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NxPaginatorComponent } from '@components/paginator/paginator.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { SearchModule } from '@components/search/search.module';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

import { NxSystemAlertsComponent } from './alerts/alerts.component';
import { NxSystemAlertCardComponent } from './card/card.component';
import { NxHealthComponent } from './health/health.component';
import { NxHealthLayoutService } from './health-layout.service';
import { NxSystemMetricsComponent } from './metrics/metrics.component';
import { NxDynamicTableComponent } from './table-components/dynamic-table/dynamic-table.component';
import { NxDynamicTablePanelComponent } from './table-components/dynamic-table-panel/dynamic-table-panel.component';
import { NxImageSectionComponent } from './table-components/image-section/image-section.component';
import { NxSingleEntityComponent } from './table-components/single-entity/single-entity.component';
import { NxUpdateInfoComponent } from './update-info/update-info.component';
import { NxReportViewerComponent } from './viewer/viewer.component';

const appRoutes: Routes = [
    {
        path: 'viewer',
        component: NxReportViewerComponent,
        children: [
            {
                path: '',
                title: 'reportViewer',
                component: NxSystemAlertsComponent,
                pathMatch: 'full',
            },
            {
                path: 'alerts',
                title: 'reportViewer',
                component: NxSystemAlertsComponent,
            },
            {
                path: ':metric',
                title: 'reportViewer',
                component: NxSystemMetricsComponent,
            },
        ],
    },
    {
        path: '',
        component: NxHealthComponent,
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        children: [
            {
                path: '',
                component: NxSystemAlertsComponent,
                pathMatch: 'full',
            },
            {
                path: 'alerts',
                title: SystemTitleResolver,
                component: NxSystemAlertsComponent,
            },
            {
                path: ':metric',
                title: SystemTitleResolver,
                component: NxSystemMetricsComponent,
            },
        ],
        // FIXME: runGuardsAndResolvers : 'always' breaks /health/
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        NgxFileDropModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        NxInfoBlockComponent,
        MenuModule,
        NxImageComponent,
        NxPagePlaceholderComponent,
        NxPaginatorComponent,
        PipesModule,
        NxPreLoaderComponent,
        SearchModule,
    ],
    providers: [NxHealthLayoutService],
    declarations: [
        NxHealthComponent,
        NxReportViewerComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxDynamicTableComponent,
        NxDynamicTablePanelComponent,
        NxSingleEntityComponent,
        NxImageSectionComponent,
        NxSystemAlertCardComponent,
        NxUpdateInfoComponent,
    ],
    bootstrap: [],
    exports: [
        NxHealthComponent,
        NxReportViewerComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
    ],
})
export class NxHealthModule {}
