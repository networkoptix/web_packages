import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { NgModule }             from '@angular/core';
import { TranslateModule }      from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule }        from '../../../components/components.module';
import { DirectivesModule }        from '../../../directives/directives.module';
import { NxAboutComponent }        from './about.component';
import { NxCapabilitiesComponent } from './capabilities/capabilities.component';
import { NxDevToolsComponent }     from '../dev-tools/dev-tools.component';
import { NxGetStartedComponent }   from './get-started/get-started.component';
import { NxIntegrationsComponent } from './integrations/integrations.component';
import { NxSupportComponent }      from './support/support.component';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxAboutComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations : [
        NxCapabilitiesComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxCapabilitiesComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent
    ],
    exports: [
        NxCapabilitiesComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent
    ]
})
export class NxAboutModule {}
