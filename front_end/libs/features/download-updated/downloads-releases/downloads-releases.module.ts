import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { DirectivesModule } from '@directives/directives.module';
import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxDownloadsReleasesComponent } from './downloads-releases.component';
import { OsResolver } from './os-resolver';

@Injectable({ providedIn: 'root' })
class TitleResolver {
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
    {
        path: '',
        title: 'download',
        component: NxDownloadsReleasesComponent,
        resolve: { platform: OsResolver },
    },
    {
        path: ':platform',
        title: TitleResolver,
        component: NxDownloadsReleasesComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxSectionPlaceholderComponent,
        MenuModule,
        NxCheckboxComponent,
    ],
    providers: [OsResolver],
    declarations: [NxDownloadsReleasesComponent],
    bootstrap: [],
    exports: [],
})
export class NxDownloadsReleasesModule {}
