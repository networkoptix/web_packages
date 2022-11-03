import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxServerDocumentationComponent } from './server-documentation.component';

const appRoutes: Routes = [
    { path: '', component: NxServerDocumentationComponent, pathMatch: 'full' },
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
    providers: [],
    declarations: [NxServerDocumentationComponent],
    bootstrap: [],
    exports: []
})
export class NxServerDocumentationModule {
}
