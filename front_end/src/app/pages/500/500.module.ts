import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';

import { Nx500Component } from './500.component';

const appRoutes: Routes = [
    { path: '', component: Nx500Component }
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
        Nx500Component
    ],
    bootstrap: [],
    exports: [
        Nx500Component
    ]
})
export class Nx500Module {
}
