import { NgModule }                  from '@angular/core';
import { DirectivesModule }          from '../directives/directives.module';
import { Angular2CsvModule }         from 'angular2-csv';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';

import { LandingModule }             from './landing/landing.module';
import { NxOverviewModule }          from './integration/details/overview/overview.module';
import { NxSetupModule }             from './integration/details/setup/setup.module';
import { NxHealthModule }            from './health/health.module';
import { NxAccountModule }           from './account/account.module';
import { Nx404Module }               from './404/404.module';
import { NxDebugModule }             from './debug/debug.module';
import { NxGridLayoutModule }        from './layout/layout.module';
import { Nx500Module }               from './500/500.module';
import { Nx503Module }               from './503/503.module';
import { NxSystemModule }            from './systems/webadmin-system.module';
import { NxSystemViewModule }        from './systems/view/view.module';

@NgModule({
    imports: [
        DirectivesModule,
        NonSupportedBrowserModule,
        Angular2CsvModule,
        NxOverviewModule,
        NxSetupModule,
        NxHealthModule,
        NxSystemModule,
        NxSystemViewModule,
        NxAccountModule,
        NxDebugModule,
        NxGridLayoutModule,
        Nx500Module,
        Nx503Module,
        Nx404Module // Must be last module for routing
    ],
    declarations : [],
    entryComponents : [],
    providers : [],
    exports : [
        NonSupportedBrowserModule,
        NxHealthModule,
        Angular2CsvModule,
        NxSystemModule,
        LandingModule,
        NxDebugModule,
        NxGridLayoutModule,
        Nx500Module,
        Nx503Module,
        Nx404Module // Must be last module for routing
    ]
})
export class WebadminPageModule {
}
