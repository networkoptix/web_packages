import { CdkStepperModule } from '@angular/cdk/stepper';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxFileDropModule } from 'ngx-file-drop';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxStepperComponent } from '@components/stepper/stepper.component';
import { PipesModule } from '@pipes/pipes.module';

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
        NxGenericDropdownModule,
        PipesModule,
        NxPreLoaderComponent,
        NxStepperComponent,
    ],
    providers: [],
    declarations: [EmailNotificationsComponent],
    bootstrap: [],
    exports: [],
})
export class EmailNotificationsModule {}
