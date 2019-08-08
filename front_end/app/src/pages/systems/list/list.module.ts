import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';
import { FormsModule }                       from '@angular/forms';
import { NgbModule }                         from '@ng-bootstrap/ng-bootstrap';

import { DirectivesModule }       from '../../../directives/directives.module';
import { NxSystemsListComponent } from './list.component';

import { TranslateModule }     from '@ngx-translate/core';
import { ComponentsModule }    from '../../../components/components.module';
import { NxRegisterComponent } from '../../register/register.component';
// import { NxOverviewComponent }  from './overview/overview.component';
// import { NxSetupComponent }     from './setup/setup.component';

const appRoutes: Routes = [
    {
        path    : 'systems', component: NxSystemsListComponent,
    }
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [
    ],
    declarations   : [
        NxSystemsListComponent
    ],
    bootstrap      : [],
    entryComponents: [
    ],
    exports        : [
        NxSystemsListComponent
    ]
})
export class NxSystemsListModule {
}

declare var angular: angular.IAngularStatic;
angular
        .module('cloudApp.directives')
        .directive('nxSystemsListComponent', downgradeComponent({ component: NxSystemsListComponent }) as angular.IDirectiveFactory);
