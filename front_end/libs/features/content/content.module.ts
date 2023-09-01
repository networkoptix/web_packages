import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxContentComponent } from './content.component';

const appRoutes: Routes = [
    { path: '', component: NxContentComponent },
    { path: ':article_param', component: NxContentComponent },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
    ],
    providers: [],
    declarations: [NxContentComponent],
    bootstrap: [],
    exports: [NxContentComponent],
})
export class ContentModule {}
