import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';

import { AngularFireModule, FirebaseOptionsToken } from '@angular/fire';
import { AngularFireMessagingModule } from '@angular/fire/messaging';

import { PushComponent } from './push-notifications.component';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';
import { NxConfigService } from '../../services/nx-config';

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
        AngularFireModule,
        AngularFireMessagingModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [
        {
            provide: FirebaseOptionsToken,
            deps: [NxConfigService],
            useFactory: initializeApp
        }
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
