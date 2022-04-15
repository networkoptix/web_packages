import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { DownloadComponent } from './download.component';
import { OsResolver } from './os-resolver';

const appRoutes: Routes = [
    // {path: 'downloads', component: DownloadComponent},
    // {path: '', redirectTo: 'download', pathMatch: 'full'},
    { path: 'download', component: DownloadComponent, resolve: { platform: OsResolver } },
    { path: 'download/:platform', component: DownloadComponent }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes)
    ],
    providers: [
        OsResolver
    ],
    declarations: [
        DownloadComponent
    ],
    bootstrap: [],
    exports: [
        DownloadComponent
    ]
})
export class DownloadModule {
}
