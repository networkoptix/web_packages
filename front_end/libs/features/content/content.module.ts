import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxContentComponent } from './content.component';

const appRoutes: Routes = [
    { path: '', component: NxContentComponent },
    { path: ':article_param', component: NxContentComponent }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
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
