import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';

import { NxContentComponent } from './content.component';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    { path    : 'content/:article_param', component: NxContentComponent }
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
        NxContentComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxContentComponent
    ],
    exports        : [
        NxContentComponent
    ]
})
export class ContentModule {
}
