import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { BrowserModule }             from '@angular/platform-browser';
import { UpgradeModule }             from '@angular/upgrade/static';
import { AngularSvgIconModule }      from 'angular-svg-icon';
import { RouterModule }              from '@angular/router';
import { FormsModule }               from '@angular/forms';
import { NgbModule }                 from '@ng-bootstrap/ng-bootstrap';
import { DirectivesModule }          from '../../../../directives/directives.module';
import { TranslateModule }           from '@ngx-translate/core';
import { ComponentsModule }          from '../../../../components/components.module';
import { OverlayModule }             from '@angular/cdk/overlay';
import { NxLicenseNewComponent }     from './new/new.component';
import { NxSystemLicensesComponent } from './licenses.component';
import { NxLicenseTrialComponent }   from './trial/trial.component';
import { NgxMaskModule }             from 'ngx-mask';
import { NxLicenseDetailComponent }  from './license-details/license.component';
import { NxLicenseSummaryComponent } from './summary/summary.component';

@NgModule({
    imports: [
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
        OverlayModule,
        NgxMaskModule
    ],
    providers       : [],
    declarations: [
        NxLicenseNewComponent,
        NxLicenseTrialComponent,
        NxSystemLicensesComponent,
        NxLicenseDetailComponent,
        NxLicenseSummaryComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxSystemLicensesComponent
    ],
    exports         : [
        NxSystemLicensesComponent
    ]
})
export class NxSystemLicensesModule {
}
