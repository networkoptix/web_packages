import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { SearchModule } from '@components/search/search.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxCamerasTableComponent } from '@pages/ipvd/cam-components/cameras-table/cameras-table.component';

import { BoolIconComponent } from './cam-components/bool-icon/bool-icon.component';
import { CamViewComponent } from './cam-components/cam-view/cam-view.component';
import { CsvButtonComponent } from './cam-components/csv-button/csv-button.component';
import { NxVendorListComponent } from './cam-components/vendor-list/vendor-list.component';
import { IpvdSearchService } from './ipvd-search.service';
import { NxIpvdComponent } from './ipvd.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'supportedDevices',
        component: NxIpvdComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NgxTranslateCutModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        ReactiveFormsModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule,
        PaginatorModule,
        SearchModule,
        ContentBlockModule,
        LayoutModule
    ],
    providers: [
        IpvdSearchService
    ],
    declarations: [
        NxIpvdComponent,
        CamViewComponent,
        CsvButtonComponent,
        BoolIconComponent,
        NxVendorListComponent,
        NxCamerasTableComponent,
    ],
    bootstrap: [],
    exports: [
        NxIpvdComponent
    ]
})

export class IpvdModule {}
