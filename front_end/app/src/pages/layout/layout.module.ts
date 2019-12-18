import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }  from '@ngx-translate/core';

import { NxLayoutComponent } from './layout.component';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    { path: 'layout', component: NxLayoutComponent },
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxLayoutComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxLayoutComponent,
    ],
    exports        : [
        NxLayoutComponent,
    ]
})
export class NxLayoutModule {
}
