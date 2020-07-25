import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }              from '../../../components/components.module';
import { MenuModule }                    from '../../../menu/menu.module';
import { NxIntegrationDetailsComponent } from './details.component';
import { NxOverviewComponent }           from './overview/overview.component';
import { NxSetupComponent }              from './setup/setup.component';

const appRoutes: Routes = [
    {
        path      : 'integrations/:id',
        component : NxIntegrationDetailsComponent,
        children  : [
            { path: '', component: NxOverviewComponent },
            { path: 'how-to-setup', component: NxSetupComponent },
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers : [],
    declarations : [
        NxIntegrationDetailsComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxIntegrationDetailsComponent
    ],
    exports: [
        NxIntegrationDetailsComponent
    ]
})
export class IntegrationDetailModule {
}
