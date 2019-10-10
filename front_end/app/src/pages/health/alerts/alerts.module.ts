import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { RouterModule }              from '@angular/router';
import { NgbModule }                         from '@ng-bootstrap/ng-bootstrap';

import { DirectivesModule }       from '../../../directives/directives.module';
import { NxSystemAlertsComponent } from './alerts.component';

import { TranslateModule }     from '@ngx-translate/core';
import { ComponentsModule }    from '../../../components/components.module';

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
    ],
    providers      : [],
    declarations   : [
        NxSystemAlertsComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxSystemAlertsComponent
    ],
    exports        : [
        NxSystemAlertsComponent
    ]
})
export class NxSystemAlertsModule {
}
