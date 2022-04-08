import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Angular2CsvModule } from 'angular2-csv';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { BoolIconComponent } from './cam-components/bool-icon/bool-icon.component';
import { CamTableComponent } from './cam-components/cam-table/cam-table.component';
import { CamViewComponent } from './cam-components/cam-view/cam-view.component';
import { CsvButtonComponent } from './cam-components/csv-button/csv-button.component';
import { NxVendorListComponent } from './cam-components/vendor-list/vendor-list.component';
import { IpvdSearchService } from './ipvd-search.service';
import { NxIpvdComponent } from './ipvd.component';

const appRoutes: Routes = [
    { path: '', component: NxIpvdComponent }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        ReactiveFormsModule,
        Angular2CsvModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule
    ],
    providers: [
        IpvdSearchService
    ],
    declarations: [
        NxIpvdComponent,
        CamTableComponent,
        CamViewComponent,
        CsvButtonComponent,
        BoolIconComponent,
        NxVendorListComponent,
    ],
    bootstrap: [],
    exports: [
        NxIpvdComponent
    ]
})

export class IpvdModule { }
