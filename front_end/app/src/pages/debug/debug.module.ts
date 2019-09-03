import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }  from '@ngx-translate/core';

import { NxDebugComponent } from './debug.component';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    {
        path: 'debug', component: NxDebugComponent,
    }
];

// TODO: Remove it after test

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        FormsModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxDebugComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxDebugComponent,
    ],
    exports        : [
        NxDebugComponent,
    ]
})
export class NxDebugModule {
}
