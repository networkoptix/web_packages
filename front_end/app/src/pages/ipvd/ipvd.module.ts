import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule }          from '@angular/forms';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';
import { Angular2CsvModule }    from 'angular2-csv';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import {
    NxIpvdComponent, CamTableComponent,
    CamViewComponent, CsvButtonComponent,
    BoolIconComponent
}                               from './';

const appRoutes: Routes = [
    { path: 'ipvd', component: NxIpvdComponent },
    { path: 'embed/ipvd', component: NxIpvdComponent }
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        NgbModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        ReactiveFormsModule,
        Angular2CsvModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxIpvdComponent,
        CamTableComponent,
        CamViewComponent,
        CsvButtonComponent,
        BoolIconComponent
    ],
    bootstrap      : [],
    exports        : [
        NxIpvdComponent
    ]
})

export class IpvdModule { }
