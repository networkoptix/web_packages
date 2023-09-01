import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@pipes/pipes.module';

import { NxServerDocumentationComponent } from './server-documentation.component';

const appRoutes: Routes = [
    { path: '', component: NxServerDocumentationComponent, pathMatch: 'full' },
];

@NgModule({
    imports: [CommonModule, RouterModule.forChild(appRoutes), TranslateModule, PipesModule],
    providers: [],
    declarations: [NxServerDocumentationComponent],
    bootstrap: [],
    exports: [],
})
export class NxServerDocumentationModule {}
