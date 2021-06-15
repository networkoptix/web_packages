import { NgModule }                  from '@angular/core';
import { Angular2CsvModule }         from 'angular2-csv';

import { DirectivesModule }          from '@directives/directives.module';
import { DownloadModule }            from './download/download.module';
import { DownloadHistoryModule }     from './download-history/download-history.module';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';
import { NxRegisterModule }          from './register/register.module';
import { NxActivateModule }          from './activate/activate.module';
import { LandingModule }             from './landing/landing.module';
import { NxAccountModule }           from './account/account.module';
import { NxRestoreModule }           from './restore/restore.module';
import { NxDebugModule }             from './debug/debug.module';
import { PushNotificationsModule }   from './push-notifications/push-notifications.module';
import { Nx500Module }               from './500/500.module';
import { Nx503Module }               from './503/503.module';
import { RouterModule, Routes }      from '@angular/router';
import { QuicklinkStrategy }         from 'ngx-quicklink';
import { ApplyGuard }                from '@guards/applyGuard';
import { AuthGuard }                 from '@guards/authGuard';
import { PipesModule } from '@src/pipes/pipes.module';

const lazyRoutes: Routes = [
    {
        path         : 'api-tool',
        loadChildren : () => import('./api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path         : 'systems/:systemId/view',
        loadChildren : () => import('./systems/view/view.module').then(m => m.NxSystemViewModule)
    },
    {
        path         : 'health-report',
        loadChildren : () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path         : 'systems/:systemId/health',
        loadChildren : () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path         : 'integrations/:id',
        loadChildren : () => import('./integration/details/details.module').then(m => m.IntegrationDetailModule)
    },
    {
        path         : 'integrations',
        loadChildren : () => import('./integration/integrations.module').then(m => m.IntegrationsModule)
    },
    {
        path         : 'systems',
        loadChildren : () => import('./systems/list/list.module').then(m => m.NxSystemsListModule)
    },
    {
        path         : 'sandbox',
        loadChildren : () => import('./sandbox/sandbox.module').then(m => m.SandboxModule)
    },
    {
        path         : 'docs',
        loadChildren : () => import('./developers/developers.module').then(m => m.NxDevelopersModule)
    },
    {
        path         : 'systems/:systemId',
        loadChildren : () => import('./systems/settings/settings.module').then(m => m.NxSettingsModule)
    },
    {
        path         : 'ipvd',
        loadChildren : () => import('./ipvd/ipvd.module').then(m => m.IpvdModule)
    },
    {
        path         : 'embed/ipvd',
        loadChildren : () => import('./ipvd/ipvd.module').then(m => m.IpvdModule)
    },
    {
        path         : '',
        pathMatch    : 'full',
        loadChildren : () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path         : 'login',
        loadChildren : () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path         : 'logout',
        loadChildren : () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path         : 'content/about',
        loadChildren : () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path         : 'content',
        loadChildren : () => import('./content/content.module').then(m => m.ContentModule)
    },
    {
        path         : 'agreement',
        loadChildren : () => import('./content/content.module').then(m => m.ContentModule)
    },
    {
        path         : '404',
        loadChildren : () => import('./404/404.module').then(m => m.Nx404Module)
    },
    {
        path         : '**',
        loadChildren : () => import('./404/404.module').then(m => m.Nx404Module)
    }
];

@NgModule({
    imports: [
        DirectivesModule,
        PipesModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        NxRegisterModule,
        NxActivateModule,
        NxRestoreModule,
        PushNotificationsModule,
        Angular2CsvModule,
        LandingModule,
        NxAccountModule,
        NxDebugModule,
        Nx500Module,
        Nx503Module,
        RouterModule.forRoot(lazyRoutes, {
            initialNavigation         : true,
            scrollPositionRestoration : 'enabled',
            anchorScrolling           : 'enabled',
            enableTracing             : false,
            preloadingStrategy        : QuicklinkStrategy
        })
    ],
    declarations: [
    ],
    providers: [
        ApplyGuard,
        AuthGuard
    ],
    exports: [
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        NxRegisterModule,
        NxActivateModule,
        NxRestoreModule,
        PushNotificationsModule,
        Angular2CsvModule,
        LandingModule,
        NxDebugModule,
        Nx500Module,
        Nx503Module,
        RouterModule
    ]
})
export class PagesModule {
}
