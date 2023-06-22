import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { FooterModule } from '@components/footer/footer.module';
import { LandingDisplayModule } from '@components/landing-display/landing-display.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';

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
        DirectivesModule,
        FooterModule,
        LandingDisplayModule,
        PipesModule,
        PreLoaderModule,
    ],
    providers: [],
    declarations: [NxLandingComponent],
    bootstrap: [],
    exports: [],
})
export class LandingModule {}
