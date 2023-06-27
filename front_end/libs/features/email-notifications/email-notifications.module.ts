import { CdkStepperModule } from '@angular/cdk/stepper';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxFileDropModule } from 'ngx-file-drop';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { DirectivesModule } from '@directives/directives.module';

import { EmailNotificationsComponent } from './email-notifications.component';

const appRoutes: Routes = [
    {
        path: '',
        component: EmailNotificationsComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        CdkStepperModule,
        NgxFileDropModule,
        TextFieldModule,
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        NxGenericDropdownModule,
        PipesModule,
        PreLoaderModule,
        StepperModule,
    ],
    providers: [],
    declarations: [EmailNotificationsComponent],
    bootstrap: [],
    exports: [],
})
export class EmailNotificationsModule {}
