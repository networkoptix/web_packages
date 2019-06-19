import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';
import { FormsModule }                       from '@angular/forms';


import { TranslateModule }    from '@ngx-translate/core';
import { ComponentsModule }   from '../../components/components.module';

import { NxActivateService } from './activate.service';
import { NxActivateComponent } from './activate.component';

// const appRoutes: Routes = [
//     {
//         path: 'activate', component: NxActivateComponent,
//     }
// ];

// TODO: Remove it after test

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,

        // RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxActivateComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxActivateComponent
    ],
    exports        : [
        NxActivateComponent
    ]
})
export class ActivateModule {
}

declare var angular: angular.IAngularStatic;
angular
        .module('cloudApp.directives')
        .directive('nxActivateComponent', downgradeComponent({ component: NxActivateComponent }) as angular.IDirectiveFactory);
