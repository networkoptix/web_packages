import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';
import { DevelopersGuard } from '@guards/developersGuard';

import { NxDevToolsComponent } from '../dev-tools/dev-tools.component';

import { NxAboutComponent } from './about.component';
import { NxCapabilitiesComponent } from './capabilities/capabilities.component';
import { NxErrorStateComponent } from './error-state/error-state.component';
import { NxGetStartedComponent } from './get-started/get-started.component';
import { NxIntegrationsComponent } from './integrations/integrations.component';
import { NxNewCapabilitiesComponent } from './new-capabilities/capabilities.component';
import { NxSupportComponent } from './support/support.component';
import { NxSupportedTechComponent } from './supported-tech/supported-tech.component';

const appRoutes: Routes = [
    {
        path: ':name',
        component: NxAboutComponent,
        canActivate: [DevelopersGuard],
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
    ],
    providers: [],
    declarations: [
        NxCapabilitiesComponent,
        NxSupportedTechComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent,
        NxErrorStateComponent,
        NxNewCapabilitiesComponent,
    ],
    bootstrap: [],
    exports: [
        NxCapabilitiesComponent,
        NxSupportedTechComponent,
        NxDevToolsComponent,
        NxGetStartedComponent,
        NxIntegrationsComponent,
        NxSupportComponent,
        NxAboutComponent,
        NxErrorStateComponent,
    ],
})
export class NxAboutModule {}
