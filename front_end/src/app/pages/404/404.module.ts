import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';

import { Nx404Component } from './404.component';

const appRoutes: Routes = [
    { path: '', component: Nx404Component }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        PagePlaceHolderModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        Nx404Component
    ],
    bootstrap: [],
    exports: [
        Nx404Component
    ]
})
export class Nx404Module {
}
