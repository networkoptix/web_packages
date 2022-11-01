import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { LicenseSummaryModule } from '@components/summary/summary.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxLicenseDetailComponent } from './license-details/license.component';
import { NxSystemLicensesComponent } from './licenses.component';
import { NxLicenseNewComponent } from './new/new.component';
import { NxLicenseTrialComponent } from './trial/trial.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        OverlayModule,
        NgxMaskModule.forRoot(),
        PagePlaceHolderModule,
        InfoBlockModule,
        ContentBlockModule,
        LicenseSummaryModule
    ],
    providers: [
    ],
    declarations: [
        NxLicenseNewComponent,
        NxLicenseTrialComponent,
        NxSystemLicensesComponent,
        NxLicenseDetailComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemLicensesComponent
    ]
})
export class NxSystemLicensesModule {
}
