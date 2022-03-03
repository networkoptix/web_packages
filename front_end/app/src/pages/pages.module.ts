import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Angular2CsvModule } from 'angular2-csv';
import { QuicklinkStrategy } from 'ngx-quicklink';

import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { BookmarksGuard } from '@guards/bookmarksGuard';
import { FeatureGuard } from '@guards/feature.guard';
import { FeatureFlagStrings } from '@services/nx-config/base-config';
import { PipesModule } from '@src/pipes/pipes.module';

import { Nx500Module } from './500/500.module';
import { Nx503Module } from './503/503.module';
import { NxAccountModule } from './account/account.module';
// import { NxDebugModule } from './debug/debug.module';
import {
    DownloadHistoryModule
} from './download-history/download-history.module';
import { DownloadModule } from './download/download.module';
import {
    NonSupportedBrowserModule
} from './non-supported-browser/non-supported-browser.module';

const lazyRoutes: Routes = [
    {
        path: '',
        loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule),
        pathMatch: 'full'
    },
    {
        path: 'systems/:systemId/advanced',
        loadChildren: () => import('./systems/settings/settings.module').then(m => m.NxSettingsModule)
    },
    {
        path: 'systems/:systemId/view',
        loadChildren: () => import('./systems/view/view.module').then(m => m.NxSystemViewModule)
    },
    {
        path: 'health-report',
        loadChildren: () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path: 'new-landing',
        loadChildren: () => import('./new-landing/new-landing.module').then(m => m.NewLandingModule)
    },
    {
        path: 'systems/:systemId/health',
        loadChildren: () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path: 'systems/:systemId/bookmarks',
        loadChildren: () => import('./systems/bookmarks/bookmarks.module').then(m => m.BookmarksModule),
        canActivate: [BookmarksGuard]
    },
    {
        path: 'integrations/:id',
        loadChildren: () => import('./integration/details/details.module').then(m => m.IntegrationDetailModule)
    },
    {
        path: 'integrations',
        loadChildren: () => import('./integration/integrations.module').then(m => m.IntegrationsModule)
    },
    {
        path: 'systems',
        loadChildren: () => import('./systems/list/list.module').then(m => m.NxSystemsListModule)
    },
    {
        path: 'systems/groups',
        loadChildren: () => import('./systems/groups/groups.module').then(m => m.NxSystemGroupsModule),
        // canActivate: [AuthGuard],
        // uncomment to enable the feature flag:
        // canLoad: [FeatureGuard],
        // data: {
        //     flags: FeatureFlagStrings.systemGroups
        // },
    },
    {
        path: 'sandbox',
        loadChildren: () => import('./sandbox/sandbox.module').then(m => m.SandboxModule)
    },
    {
        path: 'doc/developers/api-tool',
        loadChildren: () => import('./api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path: 'docs',
        loadChildren: () => import('./developers/developers.module').then(m => m.NxDevelopersModule)
    },
    {
        path: 'developers',
        loadChildren: () => import('./developer-console/developer-console.module').then(m => m.NxDeveloperConsoleModule),
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard],
        data: {
            flags: FeatureFlagStrings.customClients
        }
    },
    {
        path: 'systems/:systemId',
        loadChildren: () => import('./systems/settings/settings.module').then(m => m.NxSettingsModule)
    },
    {
        path: 'twofa-required',
        loadChildren: () => import('./twofa-required/twofa-required.module').then(m => m.TwofaRequiredModule)
    },
    {
        path: 'ipvd',
        loadChildren: () => import('./ipvd/ipvd.module').then(m => m.IpvdModule)
    },
    {
        path: 'embed/ipvd',
        loadChildren: () => import('./ipvd/ipvd.module').then(m => m.IpvdModule)
    },
    {
        path: 'login',
        loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path: 'logout',
        loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path: 'push-notifications',
        loadChildren: () => import('./push-notifications/push-notifications.module').then(m => m.PushNotificationsModule)
    },
    {
        path: 'email-notifications',
        loadChildren: () => import('./email-notifications/email-notifications.module').then(m => m.EmailNotificationsModule)
    },
    {
        path: 'content/about',
        loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule)
    },
    {
        path: 'content',
        loadChildren: () => import('./content/content.module').then(m => m.ContentModule)
    },
    {
        path: 'agreement',
        loadChildren: () => import('./content/content.module').then(m => m.ContentModule)
    },
    {
        path: 'cloud-authorize',
        loadChildren: () => import('./cloud-owner-authorization/cloud-owner-authorization.module').then(m => m.CloudOwnerAuthorizationModule)
    },
    {
        path: '404',
        loadChildren: () => import('./404/404.module').then(m => m.Nx404Module)
    },
    {
        path: 'dashboard',
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard],
        data: {
            flags: FeatureFlagStrings.dashboard,
            override: 'devServer'
        },
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.NxDashboardModule)
    },
    {
        path: '**',
        loadChildren: () => import('./404/404.module').then(m => m.Nx404Module)
    }
];

@NgModule({
    imports: [
        DirectivesModule,
        PipesModule,
        DownloadModule,
        DownloadHistoryModule,
        NonSupportedBrowserModule,
        Angular2CsvModule,
        NxAccountModule,
        // NxDebugModule,
        Nx500Module,
        Nx503Module,
        RouterModule.forRoot(lazyRoutes, {
            initialNavigation: true,
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
            enableTracing: false,
            preloadingStrategy: QuicklinkStrategy
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
        Angular2CsvModule,
        // NxDebugModule,
        Nx500Module,
        Nx503Module,
        RouterModule
    ]
})
export class PagesModule {
}
