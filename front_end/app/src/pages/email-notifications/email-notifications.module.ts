import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';
import { EmailNotificationsComponent } from './email-notifications.component';
import { NgxFileDropModule } from 'ngx-file-drop';

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
        RouterModule.forChild(appRoutes)
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
