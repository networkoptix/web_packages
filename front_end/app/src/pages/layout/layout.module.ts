import { NgModule }              from '@angular/core';
import { CommonModule }          from '@angular/common';
import { BrowserModule }         from '@angular/platform-browser';
import { UpgradeModule }         from '@angular/upgrade/static';
import { TranslateModule }       from '@ngx-translate/core';

import { NxGridLayoutComponent } from './layout.component';
import { ComponentsModule }      from '../../components/components.module';
import { DirectivesModule }      from '../../directives/directives.module';

// const appRoutes: Routes = [
//     { path: 'layout', component: NxGridLayoutComponent },
// ];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule
        // RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations : [
        NxGridLayoutComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxGridLayoutComponent
    ],
    exports: [
        NxGridLayoutComponent
    ]
})
export class NxGridLayoutModule {
}
