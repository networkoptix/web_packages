import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';

import { PushComponent } from './push-notifications.component';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';
import { NxConfigService } from '../../services';

const appRoutes: Routes = [
    {
        path: 'push-notifications', component: PushComponent,
    }
];

export function initializeApp(CONFIG: NxConfigService) {
  return CONFIG.getConfig().pushConfig;
}

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,
        RouterModule.forChild(appRoutes)
    ],
    providers      : [
    ],
    declarations   : [
        PushComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        PushComponent
    ],
    exports        : [
        PushComponent
    ]
})
export class PushNotificationsModule {
}
