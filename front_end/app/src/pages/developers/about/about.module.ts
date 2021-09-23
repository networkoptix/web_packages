import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { NgModule }             from '@angular/core';
import { TranslateModule }      from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule }        from '@components/components.module';
import { DirectivesModule }        from '@directives/directives.module';
import { NxAboutComponent }        from './about.component';
import { NxCapabilitiesComponent } from './capabilities/capabilities.component';
import { NxDevToolsComponent }     from '../dev-tools/dev-tools.component';
import { NxGetStartedComponent }   from './get-started/get-started.component';
import { NxIntegrationsComponent } from './integrations/integrations.component';
import { NxSupportComponent }      from './support/support.component';
import { NxErrorStateComponent }   from './error-state/error-state.component';
import {
    NxSupportedTechComponent
}                                  from './supported-tech/supported-tech.component';
import { NgbModule }               from '@ng-bootstrap/ng-bootstrap';
import { PipesModule }             from '@src/pipes/pipes.module';
import { DevelopersGuard } from '@src/routeGuards';
import { NxNewCapabilitiesComponent } from './new-capabilities/capabilities.component';

const appRoutes: Routes = [
    {
        path        : ':name',
        component   : NxAboutComponent,
        canActivate : [DevelopersGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        FormsModule,
        NgbModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxCapabilitiesComponent,
        NxSupportedTechComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent,
        NxErrorStateComponent,
        NxNewCapabilitiesComponent
    ],
    bootstrap : [],
    exports   : [
        NxCapabilitiesComponent,
        NxSupportedTechComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent,
        NxErrorStateComponent
    ]
})
export class NxAboutModule {}
