import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';

import { DownloadHistoryComponent } from './download-history.component';
import { ReleaseComponent } from './release/release.component';
import { TypeResolver } from './type-resolver';

@Injectable({ providedIn: 'root' })
class TitleResolver implements Resolve<string> {
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
        pathMatch: 'full'
    },
    {
        path: 'history',
        component: DownloadHistoryComponent,
        resolve: { type: TypeResolver }
    },
    {
        path: ':type',
        title: TitleResolver,
        component: DownloadHistoryComponent
    }
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
