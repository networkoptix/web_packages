import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxFileDropModule } from 'ngx-file-drop';

import { ComponentsModule } from '@components/components.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { EmailNotificationsComponent } from './email-notifications.component';

const appRoutes: Routes = [
    {
        path: '', component: EmailNotificationsComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        NgxFileDropModule,
        RouterModule.forChild(appRoutes),
        StepperModule
    ],
    providers: [],
    declarations: [
        EmailNotificationsComponent
    ],
    bootstrap: [],
    exports: []
})
export class EmailNotificationsModule {
}
