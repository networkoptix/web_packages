import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxSearchComponent } from '@components/search/search.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxIntegrationsComponent } from './integrations.component';
import { IntegrationsListModule } from './list/list.module';

const appRoutes: Routes = [
    {
        path: '',
        title: '{ "baseTitle": "integrations", "descr": ["integration", "seoPageDesc"] }',
        component: NxIntegrationsComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        IntegrationsListModule,
        PipesModule,
        NxSearchComponent,
    ],
    providers: [],
    declarations: [NxIntegrationsComponent],
    bootstrap: [],
    exports: [NxIntegrationsComponent],
})
export class IntegrationsModule {}
