import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxLicenseSummaryComponent } from '@components/summary/summary.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxLicenseDetailComponent } from './license-details/license.component';
import { NxSystemLicensesComponent } from './licenses.component';
import { NxLicenseNewComponent } from './new/new.component';
import { NxLicenseTrialComponent } from './trial/trial.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NgxMaskModule.forRoot(),
        OverlayModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxInfoBlockComponent,
        NxLicenseSummaryComponent,
        NxGenericDropdownModule,
        NxPagePlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
    ],
    providers: [],
    declarations: [
        NxLicenseNewComponent,
        NxLicenseTrialComponent,
        NxSystemLicensesComponent,
        NxLicenseDetailComponent,
    ],
    bootstrap: [],
    exports: [NxSystemLicensesComponent],
})
export class NxSystemLicensesModule {}
