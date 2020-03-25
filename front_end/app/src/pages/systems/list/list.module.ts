import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { BrowserModule }          from '@angular/platform-browser';
import { UpgradeModule }          from '@angular/upgrade/static';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';
import { DirectivesModule }       from '../../../directives/directives.module';
import { ComponentsModule }       from '../../../components/components.module';
import { AuthGuard }              from '../../../routeGuards/authGuard';
import { NxSettingsModule }       from '../settings/settings.module';
import { NxSystemsListComponent } from './list.component';

const appRoutes: Routes = [
    {
        path: 'systems', component: NxSystemsListComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports         : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,

        RouterModule.forChild(appRoutes),
        NxSettingsModule
    ],
    providers       : [],
    declarations    : [
        NxSystemsListComponent
    ],
    bootstrap       : [],
    entryComponents : [],
    exports         : [
        NxSystemsListComponent
    ]
})
export class NxSystemsListModule {
}
