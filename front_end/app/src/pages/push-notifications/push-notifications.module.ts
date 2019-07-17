import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';

import { AngularFireModule } from '@angular/fire';
import { AngularFireMessagingModule } from '@angular/fire/messaging';

import { PushComponent } from './push-notifications.component';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    {
        // path: 'push-notifications', component: PushComponent,
    }
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,
        AngularFireModule.initializeApp(FIREBASE),
        AngularFireMessagingModule

        // RouterModule.forChild(appRoutes)
    ],
    providers      : [],
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

declare var angular: angular.IAngularStatic;
angular
    .module('cloudApp.directives')
    .directive('pushComponent', downgradeComponent({component: PushComponent}) as angular.IDirectiveFactory);

