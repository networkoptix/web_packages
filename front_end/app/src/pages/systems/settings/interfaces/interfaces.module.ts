import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';
import { FormsModule }                       from '@angular/forms';
import { NgbModule }                         from '@ng-bootstrap/ng-bootstrap';

import { DirectivesModule }       from '../../../../directives/directives.module';
import { NxSystemInterfacesComponent } from './interfaces.component';

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
    ],
    providers      : [],
    declarations   : [
        NxSystemInterfacesComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxSystemInterfacesComponent
    ],
    exports        : [
        NxSystemInterfacesComponent
    ]
})
export class NxSystemInterfacesModule {
}
