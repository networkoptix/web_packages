import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { BrowserModule }             from '@angular/platform-browser';
import { UpgradeModule }             from '@angular/upgrade/static';
import { AngularSvgIconModule }      from 'angular-svg-icon';
import { RouterModule }              from '@angular/router';
import { FormsModule }               from '@angular/forms';
import { NgbModule }                 from '@ng-bootstrap/ng-bootstrap';
import { DirectivesModule }          from '../../../../directives/directives.module';
import { TranslateModule }           from '@ngx-translate/core';
import { ComponentsModule }          from '../../../../components/components.module';
import { NxSystemLicensesComponent } from './licenses.component';
import { OverlayModule }             from '@angular/cdk/overlay';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        OverlayModule
    ],
    providers       : [],
    declarations    : [
        NxSystemLicensesComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxSystemLicensesComponent
    ],
    exports         : [
        NxSystemLicensesComponent
    ]
})
export class NxSystemLicensesModule {
}
