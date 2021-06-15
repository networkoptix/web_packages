import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { PushComponent }        from './push-notifications.component';
import { NxConfigService }      from '../../services/nx-config';
import { PipesModule } from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: 'push-notifications', component: PushComponent
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
