import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { AngularSvgIconModule }      from 'angular-svg-icon';
import { RouterModule }              from '@angular/router';
import { FormsModule }               from '@angular/forms';
import { OverlayModule }             from '@angular/cdk/overlay';
import { NgbModule }                 from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }           from '@ngx-translate/core';
import { NgxMaskModule }             from 'ngx-mask';

import { DirectivesModule }          from '../../../../directives/directives.module';
import { ComponentsModule }          from '../../../../components/components.module';
import { NxLicenseNewComponent }     from './new/new.component';
import { NxSystemLicensesComponent } from './licenses.component';
import { NxLicenseTrialComponent }   from './trial/trial.component';
import { NxLicenseDetailComponent }  from './license-details/license.component';
import { NxLicenseSummaryComponent } from './summary/summary.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        OverlayModule,
        NgxMaskModule
    ],
    providers: [
    ],
    declarations: [
        NxLicenseNewComponent,
        NxLicenseTrialComponent,
        NxSystemLicensesComponent,
        NxLicenseDetailComponent,
        NxLicenseSummaryComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemLicensesComponent
    ]
})
export class NxSystemLicensesModule {
}
