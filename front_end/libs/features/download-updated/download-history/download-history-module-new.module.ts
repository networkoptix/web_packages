import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { DownloadHistoryComponentNewComponent } from './download-history-component-new.component';
import { ReleaseComponent } from './release/release.component';
import { TypeResolver } from './type-resolver';

@Injectable({ providedIn: 'root' })
class TitleResolver {
    resolve(route: ActivatedRouteSnapshot): string {
        if (route.params.type) {
            return route.params.type;
        }

        return '';
    }
}

const appRoutes: Routes = [
    {
        path: '',
        redirectTo: 'releases',
        pathMatch: 'full',
    },
    {
        path: 'history',
        component: DownloadHistoryComponentNewComponent,
        resolve: { type: TypeResolver },
    },
    {
        path: ':type',
        title: TitleResolver,
        component: DownloadHistoryComponentNewComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        DirectivesModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [TypeResolver],
    declarations: [DownloadHistoryComponentNewComponent, ReleaseComponent],
    bootstrap: [],
    exports: [DownloadHistoryComponentNewComponent],
})
export class DownloadHistoryModuleNewModule {}
