import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';
import { FormsModule }                       from '@angular/forms';

import { NxRegisterComponent } from './register.component';

import { TranslateModule }    from '@ngx-translate/core';
import { ComponentsModule }   from '../../components/components.module';
import { LandingModule } from '../landing/landing.module';
import { NxLanguageDropdown } from '../../components/dropdowns/language/language.component';

// const appRoutes: Routes = [
//     {
//         path: 'register', component: NxRegisterComponent,
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
        LandingModule

        // RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxRegisterComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxRegisterComponent
    ],
    exports        : [
        NxRegisterComponent
    ]
})
export class RegisterModule {
}

declare var angular: angular.IAngularStatic;
angular
        .module('cloudApp.directives')
        .directive('nxRegisterComponent', downgradeComponent({ component: NxRegisterComponent }) as angular.IDirectiveFactory);
