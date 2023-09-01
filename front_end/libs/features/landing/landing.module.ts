import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxLandingDisplayComponent } from '@components/landing-display/landing-display.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxLandingComponent } from './landing.component';

const appRoutes: Routes = [
    {
        path: '',
        title: '{"baseTitle": "", "type": "info", "descr": ["landing", "description"]}',
        component: NxLandingComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxFooterComponent,
        NxLandingDisplayComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [],
    declarations: [NxLandingComponent],
    bootstrap: [],
    exports: [],
})
export class LandingModule {}
