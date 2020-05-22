import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { BrowserModule }          from '@angular/platform-browser';
import { UpgradeModule }          from '@angular/upgrade/static';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';
import { AngularSvgIconModule }   from 'angular-svg-icon';
import { NgxFileDropModule }      from 'ngx-file-drop';
import { MenuModule }             from '../../menu';
import { ComponentsModule }       from '../../components/components.module';
import { AuthGuard, SystemGuard } from '../../routeGuards';
import { PipesModule }            from '../../pipes/pipes.module';

import {
    NxHealthComponent, NxSystemAlertsComponent,
    NxSystemMetricsComponent, NxDynamicTableComponent,
    NxDynamicTablePanelComponent, NxSingleEntityComponent,
    NxImageComponent, NxImageSectionComponent,
    NxSystemAlertCardComponent, NxUpdateInfoComponent
} from './';
import { nxConfig } from '../../services/nx-config/config';

const CONFIG = nxConfig;
const appRoutes: Routes = !CONFIG.isLocal ? [
    {
        path        : 'systems/:systemId/health',
        component   : NxHealthComponent,
        canActivate : [AuthGuard, SystemGuard],
        children    : [
            {
                path      : '',
                component : NxSystemAlertsComponent,
                pathMatch : 'full'
            },
            {
                path: 'alerts', component: NxSystemAlertsComponent
            },
            {
                path: ':metric', component: NxSystemMetricsComponent
            }
        ]
    }
] : [
    {
        path        : 'health',
        component   : NxHealthComponent,
        canActivate : [AuthGuard, SystemGuard],
        children    : [
            {
                path: '', component: NxSystemAlertsComponent, pathMatch: 'full'
            },
            {
                path: 'alerts', component: NxSystemAlertsComponent
            },
            {
                path: ':metric', component: NxSystemMetricsComponent
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        AngularSvgIconModule.forRoot(),
        NgxFileDropModule,
        PipesModule,

        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers    : [],
    declarations : [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxDynamicTableComponent,
        NxDynamicTablePanelComponent,
        NxSingleEntityComponent,
        NxImageComponent,
        NxImageSectionComponent,
        NxSystemAlertCardComponent,
        NxUpdateInfoComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxImageSectionComponent,
        NxImageComponent,
        NxUpdateInfoComponent
    ],
    exports: [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxImageComponent
    ]
})
export class NxHealthModule {
}
