import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';

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
        NgbModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        MenuModule,
        AngularSvgIconModule,
        RouterModule.forChild(appRoutes),
        PipesModule
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
