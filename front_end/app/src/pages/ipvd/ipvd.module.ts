import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule }          from '@angular/forms';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';
import { Angular2CsvModule }    from 'angular2-csv';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { NxIpvdComponent }      from './ipvd.component';
import { CamTableComponent }    from './cam-components/cam-table/cam-table.component';
import { CamViewComponent }     from './cam-components/cam-view/cam-view.component';
import { CsvButtonComponent }   from './cam-components/csv-button/csv-button.component';
import { BoolIconComponent }    from './cam-components/bool-icon/bool-icon.component';
import { IpvdSearchService }    from './ipvd-search.service';

const appRoutes: Routes = [
    { path: '', component: NxIpvdComponent }
];

@NgModule({
    imports        : [
        CommonModule,
        NgbModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        ReactiveFormsModule,
        Angular2CsvModule,
        RouterModule.forChild(appRoutes)
    ],
    providers      : [
        IpvdSearchService
    ],
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
