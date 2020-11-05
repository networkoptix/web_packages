import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule } from '../../../../components/components.module';
import { NxSetupComponent } from './setup.component';

// TODO: Remove it after test

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        NgbModule,
        TranslateModule,
        ComponentsModule
    ],
    providers : [],
    declarations : [
        NxSetupComponent
    ],
    bootstrap : [],
    exports: [
        NxSetupComponent
    ]
})
export class NxSetupModule {
}
