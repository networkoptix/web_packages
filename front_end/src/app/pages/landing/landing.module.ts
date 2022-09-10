import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxLandingComponent } from './landing.component';

const appRoutes: Routes = [
    { path: '', component: NxLandingComponent, pathMatch: 'full' }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        PreLoaderModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        NxLandingComponent
    ],
    bootstrap: [],
    exports: []
})
export class LandingModule {
}
