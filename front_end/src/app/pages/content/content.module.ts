import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxContentComponent } from './content.component';

const appRoutes: Routes = [
    { path: '', component: NxContentComponent },
    { path: ':article_param', component: NxContentComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        NxContentComponent
    ],
    bootstrap: [],
    exports: [
        NxContentComponent
    ]
})
export class ContentModule {
}
