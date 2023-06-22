import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { PipesModule } from '@app/pipes/pipes.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { LicenseSummaryModule } from '@components/summary/summary.module';
import { DirectivesModule } from '@directives/directives.module';

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
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        InfoBlockModule,
        LicenseSummaryModule,
        NxGenericDropdownModule,
        PagePlaceHolderModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
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
