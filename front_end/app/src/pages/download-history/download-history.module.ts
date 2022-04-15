import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { DownloadHistoryComponent } from './download-history.component';
import { ReleaseComponent } from './release/release.component';
import { TypeResolver } from './type-resolver';

const appRoutes: Routes = [
    // { path: '', redirectTo: 'download', pathMatch: 'full' },
    { path: 'downloads/history', component: DownloadHistoryComponent, resolve: { type: TypeResolver } },
    { path: 'downloads/:type', component: DownloadHistoryComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DirectivesModule,
        PipesModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [
        TypeResolver
    ],
    declarations: [
        DownloadHistoryComponent,
        ReleaseComponent
    ],
    bootstrap: [],
    exports: [
        DownloadHistoryComponent
    ]
})
export class DownloadHistoryModule {
}
