import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';

import { NxMonitoringComponent } from './monitoring.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxMonitoringComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
    ],
    providers: [],
    declarations: [
        NxMonitoringComponent,
    ],
    bootstrap: [],
    exports: [
        NxMonitoringComponent
    ]
})
export class NxMonitoringModule {
}
