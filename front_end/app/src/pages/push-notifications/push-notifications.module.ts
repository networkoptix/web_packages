import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxConfigService } from '@services/nx-config';
import { PipesModule } from '@src/pipes/pipes.module';

import { PushComponent } from './push-notifications.component';

const appRoutes: Routes = [
    {
        path: '', component: PushComponent
    }
];

export function initializeApp(CONFIG: NxConfigService) {
    return CONFIG.getConfig().pushConfig;
}

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [
    ],
    declarations: [
        PushComponent
    ],
    bootstrap: [
    ],
    exports: [
        PushComponent
    ]
})
export class PushNotificationsModule {
}
