import { NgModule }                   from '@angular/core';
import { CommonModule }               from '@angular/common';
import { BrowserModule }              from '@angular/platform-browser';
import { UpgradeModule }              from '@angular/upgrade/static';
import { RouterModule }               from '@angular/router';
import { FormsModule }                from '@angular/forms';
import { AngularSvgIconModule }       from 'angular-svg-icon';
import { NgbModule }                  from '@ng-bootstrap/ng-bootstrap';
import { DirectivesModule }           from '../../../directives/directives.module';
import { NxAccountSettingsComponent } from './settings.component';
import { TranslateModule }            from '@ngx-translate/core';
import { ComponentsModule }           from '../../../components/components.module';

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
        AngularSvgIconModule.forRoot()
    ],
    providers      : [],
    declarations   : [
        NxAccountSettingsComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxAccountSettingsComponent
    ],
    exports        : [
        NxAccountSettingsComponent
    ]
})
export class NxAccountSettingsModule {
}
