import { NgModule }                   from '@angular/core';
import { CommonModule }               from '@angular/common';
import { RouterModule }               from '@angular/router';
import { FormsModule }                from '@angular/forms';
import { NgbModule }                  from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }            from '@ngx-translate/core';

import { DirectivesModule }           from '@directives/directives.module';
import { ComponentsModule }           from '@components/components.module';
import { NxAccountSecurityComponent } from './security.component';


@NgModule({
    imports        : [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule
    ],
    providers      : [],
    declarations   : [
        NxAccountSecurityComponent
    ],
    bootstrap      : [],
    exports        : [
        NxAccountSecurityComponent
    ]
})
export class NxAccountSecurityModule {
}
