import { NgModule } from '@angular/core';

import { DirectivesModule }  from '../directives/directives.module';
import { SandboxModule }     from './sandbox/sandbox.module';
import { IpvdModule }        from './ipvd/ipvd.module';
import { Angular2CsvModule } from 'angular2-csv';

import { DownloadModule }            from './download/download.module';
import { DownloadHistoryModule }     from './download-history/download-history.module';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';

import { RegisterModule } from './register/register.module';

import { RightMenuModule }        from './right-menu/right-menu.module';
import { ContentModule }          from './content/content.module';
import { IntegrationsModule }     from './integration/integrations.module';
import { IntegrationsListModule } from './integration/list/list.module';
import { LandingModule }          from './landing/landing.module';

import { NxOverviewModule }         from './integration/details/overview/overview.module';
import { NxSetupModule }            from './integration/details/setup/setup.module';
import { NxSettingsModule }         from './systems/settings/settings.module';
import { NxSystemsListModule }      from './systems/list/list.module';

@NgModule({
    imports        : [
        DirectivesModule,
        SandboxModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        RegisterModule,
        IntegrationsModule,
        ContentModule,          // TODO: Remove it after test
        RightMenuModule,        // TODO: Remove it after test
        IpvdModule,
        Angular2CsvModule,
        LandingModule,
        NxOverviewModule,
        NxSetupModule,
        NxSettingsModule,
        NxSystemsListModule,
    ],
    declarations   : [],
    entryComponents: [],
    providers      : [],
    exports        : [
        SandboxModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        RegisterModule,
        IntegrationsModule,
        NxSettingsModule,
        ContentModule,          // TODO: Remove it after test
        RightMenuModule,        // TODO: Remove it after test
        IpvdModule,
        Angular2CsvModule,
        LandingModule,
    ]
})
export class PagesModule {
}

