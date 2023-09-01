import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';

import { DownloadHistoryComponent } from './download-history.component';
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
        component: DownloadHistoryComponent,
        resolve: { type: TypeResolver },
    },
    {
        path: ':type',
        title: TitleResolver,
        component: DownloadHistoryComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    declarations: [DownloadHistoryComponent, ReleaseComponent],
    exports: [DownloadHistoryComponent],
})
export class DownloadHistoryModule {}
