import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { TagModule } from '@components/tag/tag.module';

import { DirectivesModule } from '../../../directives/directives.module';

import { NxIntegrationDetailsComponent } from './details.component';
import { NxOverviewComponent } from './overview/overview.component';
import { NxSetupComponent } from './setup/setup.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxIntegrationDetailsComponent,
        children: [
            { path: '', component: NxOverviewComponent },
            { path: 'how-to-setup', component: NxSetupComponent }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        MenuModule,
        AngularSvgIconModule,
        RouterModule.forChild(appRoutes),
        PipesModule,
        DirectivesModule,
        TagModule,
        ContentBlockModule
    ],
    providers: [],
    declarations: [
        NxIntegrationDetailsComponent,
        NxSetupComponent,
        NxOverviewComponent
    ],
    bootstrap: [],
    exports: [
        NxIntegrationDetailsComponent,
        NxSetupComponent,
        NxOverviewComponent
    ]
})
export class IntegrationDetailModule {
}
