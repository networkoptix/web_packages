import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRouteSnapshot, Resolve, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';

import { DownloadComponent } from './download.component';
import { OsResolver } from './os-resolver';

@Injectable({ providedIn: 'root' })
class TitleResolver implements Resolve<string> {
    resolve(route: ActivatedRouteSnapshot): string {
        if (route.params.platform && route.params.platform !== 'sdk') {
            return `
                {
                    "baseTitle": "downloadPlatform",
                    "modifier": "${route.params.platform}"
                }
            `;
        }

        return 'download';
    }
}

const appRoutes: Routes = [
    // { path: 'downloads', component: DownloadComponent},
    // { path: '', redirectTo: 'download', pathMatch: 'full' },
    {
        path: '',
        title: 'download',
        component: DownloadComponent,
        resolve: { platform: OsResolver }
    },
    {
        path: ':platform',
        title: TitleResolver,
        component: DownloadComponent,
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
        SectionPlaceholderModule
    ],
    providers: [
        OsResolver
    ],
    declarations: [
        DownloadComponent
    ],
    bootstrap: [],
    exports: []
})
export class DownloadModule {
}
