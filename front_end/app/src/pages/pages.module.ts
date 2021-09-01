import { NgModule }                  from '@angular/core';
import { Angular2CsvModule }         from 'angular2-csv';
import { DirectivesModule }          from '@directives/directives.module';
import { DownloadModule }            from './download/download.module';
import { DownloadHistoryModule }     from './download-history/download-history.module';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';
import { NxRegisterModule }          from './register/register.module';
import { NxActivateModule }          from './activate/activate.module';
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
import { FeatureGuard }              from '@src/routeGuards';
import { PipesModule }               from '@src/pipes/pipes.module';
import { FeatureFlagStrings }        from '@services/nx-config/base-config';
import { NxConfigService }           from '@services/nx-config';

const lazyRoutes: Routes = [
    {
        path         : 'doc/developers/api-tool',
        loadChildren : () => import('./api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path         : '',
        loadChildren : () => import('./new-landing/landing-routing.module').then(m => m.LandingRoutingModule),
        pathMatch    : 'full'
    },
    {
        path         : 'systems/:systemId/view',
        loadChildren : () => {
            // Before release remove this logic and load only NxOldViewModule ...
            // ... or enhance the logic to load new player only if desktop Chrome (TBD) -- TT
            if (NxConfigService.useNewPlayer || new URLSearchParams(document.location.search).get('player') === 'new') {
                return import('./systems/view/view.module').then(m => m.NxSystemViewModule);
            }
            return import('./systems/old-view/old-view.module').then(m => m.NxOldViewModule);
        }
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
        path         : 'developers',
        loadChildren : () => import('./developer-console/developer-console.module').then(m => m.NxDeveloperConsoleModule),
        canLoad      : [FeatureGuard],
        data         : {
            flags: FeatureFlagStrings.customClients
        }
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
        path         : 'redirect-oauth',
        loadChildren : () => import('./oauth-redirect/oauth-redirect.module').then(m => m.NxOAuthRedirectModule)
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
        NxDebugModule,
        Nx500Module,
        Nx503Module,
        RouterModule
    ]
})
export class PagesModule {
}
