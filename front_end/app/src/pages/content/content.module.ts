import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }     from '@components/components.module';
import { DirectivesModule }     from '@directives/directives.module';
import { NxContentComponent }   from './content.component';
import { PipesModule } from '@src/pipes/pipes.module';

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
    providers    : [],
    declarations : [
        NxContentComponent
    ],
    bootstrap : [],
    exports   : [
        NxContentComponent
    ]
})
export class ContentModule {
}
