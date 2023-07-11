import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxMergeAdminPasswordComponent } from './admin-password/admin-password.component';
import { NxMergeChoosePrimaryComponent } from './choose-primary/choose-primary.component';
import { NxMergeConfirmMergeComponent } from './confirm-merge/confirm-merge.component';
import { NxMergeGenericMergeComponent } from './generic-merge/generic-merge.component';
import { MergeModalContent } from './merge.component';
import { NxMergeComponent } from './merge.refactor.component';
import { NxMergeSelectSystemComponent } from './select-system/select-system.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NgxTranslateCutModule,
        // DirectivesModule,
        NxGenericDropdownModule,
        PipesModule,
        NxProcessButtonComponent,
        NxRadioComponent,
    ],
    providers: [],
    declarations: [
        MergeModalContent,
        NxMergeComponent,
        NxMergeAdminPasswordComponent,
        NxMergeChoosePrimaryComponent,
        NxMergeConfirmMergeComponent,
        NxMergeGenericMergeComponent,
        NxMergeSelectSystemComponent,
    ],
    exports: [],
})
export class NxMergeModule {}
