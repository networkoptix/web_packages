import { NgModule } from '@angular/core';

import { DirectivesModule }  from '../directives/directives.module';
import { SandboxModule }     from './sandbox/sandbox.module';
import { IpvdModule }        from './ipvd/ipvd.module';
import { Angular2CsvModule } from 'angular2-csv';

import { DownloadModule }            from './download/download.module';
import { DownloadHistoryModule }     from './download-history/download-history.module';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';
import { NxRegisterModule }          from './register/register.module';
import { NxActivateModule }          from './activate/activate.module';
import { RightMenuModule }           from './right-menu/right-menu.module';
import { ContentModule }             from './content/content.module';
import { IntegrationsModule }        from './integration/integrations.module';
import { IntegrationsListModule }    from './integration/list/list.module';
import { LandingModule }             from './landing/landing.module';
import { NxOverviewModule }          from './integration/details/overview/overview.module';
import { NxSetupModule }             from './integration/details/setup/setup.module';
import { NxSettingsModule }          from './systems/settings/settings.module';
import { NxSystemsListModule }       from './systems/list/list.module';
import { NxHealthModule }            from './health/health.module';
import { NxAccountModule }           from './account/account.module';
import { NxRestoreModule }           from './restore/restore.module';
import { Nx404Module }               from './404/404.module';
import { NxDebugModule }             from './debug/debug.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';

@NgModule({
    imports        : [
        DirectivesModule,
        SandboxModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        NxRegisterModule,
        NxActivateModule,
        NxRestoreModule,
        IntegrationsModule,
        IntegrationsListModule,
        ContentModule,          // TODO: Remove it after test
        RightMenuModule,        // TODO: Remove it after test
        PushNotificationsModule,
        IpvdModule,
        Angular2CsvModule,
        LandingModule,
        NxOverviewModule,
        NxSetupModule,
        NxSettingsModule,
        NxHealthModule,
        NxSystemsListModule,
        NxAccountModule,
        NxDebugModule,
        Nx404Module,  // Must be last module for routing
    ],
    declarations   : [],
    entryComponents: [],
    providers      : [],
    exports        : [
        SandboxModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        NxRegisterModule,
        NxActivateModule,
        NxRestoreModule,
        IntegrationsModule,
        IntegrationsListModule,
        NxSettingsModule,
        NxHealthModule,
        ContentModule,          // TODO: Remove it after test
        RightMenuModule,        // TODO: Remove it after test
        PushNotificationsModule,
        IpvdModule,
        Angular2CsvModule,
        LandingModule,
        NxDebugModule,
        Nx404Module, // Must be last module for routing
    ]
})
export class PagesModule {
}

