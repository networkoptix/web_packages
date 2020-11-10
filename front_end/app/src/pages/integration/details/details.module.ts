import { NgModule }                      from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { RouterModule, Routes }          from '@angular/router';
import { NgbModule }                     from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }               from '@ngx-translate/core';
import { AngularSvgIconModule }          from 'angular-svg-icon';
import { ComponentsModule }              from '../../../components/components.module';
import { MenuModule }                    from '../../../menu/menu.module';
import { NxIntegrationDetailsComponent } from './details.component';
import { NxOverviewComponent }           from './overview/overview.component';
import { NxSetupComponent }              from './setup/setup.component';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxIntegrationDetailsComponent,
        children  : [
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
        MenuModule,
        AngularSvgIconModule,
        RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations : [
        NxIntegrationDetailsComponent
    ],
    bootstrap : [],
    exports: [
        NxIntegrationDetailsComponent
    ]
})
export class IntegrationDetailModule {
}
