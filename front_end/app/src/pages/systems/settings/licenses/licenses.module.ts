import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxLicenseDetailComponent } from './license-details/license.component';
import { NxSystemLicensesComponent } from './licenses.component';
import { NxLicenseNewComponent } from './new/new.component';
import { NxLicenseSummaryComponent } from './summary/summary.component';
import { NxLicenseTrialComponent } from './trial/trial.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
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
