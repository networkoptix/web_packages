import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';
import { FormsModule }                       from '@angular/forms';
import { NgbModule }                         from '@ng-bootstrap/ng-bootstrap';
import { AngularSvgIconModule }              from 'angular-svg-icon';

import { DirectivesModule }       from '../../../../directives/directives.module';
import { NxSystemServersComponent } from './servers.component';

import { TranslateModule }     from '@ngx-translate/core';
import { ComponentsModule }    from '../../../../components/components.module';

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
    ],
    providers      : [],
    declarations   : [
        NxSystemServersComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxSystemServersComponent
    ],
    exports        : [
        NxSystemServersComponent
    ]
})
export class NxSystemServersModule {
}
