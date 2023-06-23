import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';
// import { HoverPreloadStrategy } from 'ngx-hover-preload';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxPageTitleStrategy } from '@app/resolvers/title-resolver';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { FeatureGuard } from '@guards/feature.guard';
import { RedirectAuthGuard } from '@guards/redirectAuthGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { FeatureFlagStrings } from '@services/nx-config/base-config';

const lazyRoutes: Routes = [
    {
        path: '',
        loadChildren: () => import('@pages/landing/landing.module').then(m => m.LandingModule),
        pathMatch: 'full',
    },
    {
        path: 'account',
        loadChildren: () => import('@pages/account/account.module').then(m => m.NxAccountModule),
    },
    // {
    //     path: 'partners',
    //     loadChildren: () => import('@pages/channel-partners/partners.module').then(m => m.NxChannelPartnersModule)
    // },
    // {
    //     path: 'organizations',
    //     loadChildren: () => import('@pages/channel-partners/organizations').then(m => m.NxPartnerOrganizationsModule)
    // },
    {
        path: 'systems/:systemId/advanced',
        loadChildren: () =>
            import('@pages/systems/settings/settings.module').then(m => m.NxSettingsModule),
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
    },
    {
        path: 'systems/:systemId/view',
        loadChildren: () =>
            import('@pages/systems/view/view.module').then(m => m.NxSystemViewModule),
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
    },
    {
        path: 'systems/:systemId/layouts',
        loadChildren: () =>
            import('@pages/systems/layout-view/layout-view.module').then(m => m.NxLayoutViewModule),
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        data: {
            flags: FeatureFlagStrings.layouts,
        },
    },
    {
        path: 'theme-generator',
        loadChildren: () =>
            import('@pages/theme-generator-demo/theme-generator-demo.module').then(
                m => m.NxThemeGeneratorDemoModule,
            ),
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard],
        data: {
            flags: FeatureFlagStrings.themeGenerator,
        },
    },
    {
        path: 'health-report',
        loadChildren: () => import('@pages/health/health.module').then(m => m.NxHealthModule),
    },
    {
        path: 'new-landing',
        loadChildren: () =>
            import('@pages/new-landing/new-landing.module').then(m => m.NewLandingModule),
    },
    {
        path: 'systems',
        title: 'systems',
        loadChildren: () =>
            import('@pages/systems/list/list.module').then(m => m.NxSystemsListModule),
    },
    {
        path: 'systems/:systemId',
        loadChildren: () =>
            import('@pages/systems/settings/settings.module').then(m => m.NxSettingsModule),
    },
    {
        path: 'home',
        loadChildren: () => import('@pages/home/home.module').then(m => m.NxHomeModule),
        canLoad: [FeatureGuard],
        data: {
            flags: FeatureFlagStrings.systemGroups,
        },
    },
    {
        path: 'systems/:systemId/health',
        loadChildren: () => import('@pages/health/health.module').then(m => m.NxHealthModule),
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
    },
    {
        path: 'systems/:systemId/bookmarks',
        loadChildren: () =>
            import('@pages/systems/bookmarks/bookmarks.module').then(m => m.BookmarksModule),
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
    },
    {
        path: 'systems/:systemId/monitoring',
        loadChildren: () =>
            import('@pages/monitoring/monitoring.module').then(m => m.NxMonitoringModule),
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
    },
    {
        path: 'integrations/:id',
        loadChildren: () =>
            import('@pages/integration/details/details.module').then(
                m => m.IntegrationDetailModule,
            ),
    },
    {
        path: 'integrations',
        loadChildren: () =>
            import('@pages/integration/integrations.module').then(m => m.IntegrationsModule),
    },
    {
        path: 'download',
        loadChildren: () => import('@pages/download/download.module').then(m => m.DownloadModule),
    },
    {
        path: 'downloads',
        loadChildren: () =>
            import('@pages/download-history/download-history.module').then(
                m => m.DownloadHistoryModule,
            ),
    },
    {
        path: 'sandbox',
        loadChildren: () => import('@pages/sandbox/sandbox.module').then(m => m.SandboxModule),
    },
    {
        path: 'doc/developers/api-tool',
        loadChildren: () => import('@pages/api-tool/api-tool.module').then(m => m.NxApiToolModule),
    },
    {
        path: 'docs',
        loadChildren: () =>
            import('@pages/developers/developers.module').then(m => m.NxDevelopersModule),
    },
    {
        path: 'developers',
        loadChildren: () =>
            import('@pages/developer-console/developer-console.module').then(
                m => m.NxDeveloperConsoleModule,
            ),
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard],
        data: {
            flags: FeatureFlagStrings.customClients,
        },
    },
    {
        path: 'twofa-required',
        loadChildren: () =>
            import('@pages/twofa-required/twofa-required.module').then(m => m.TwofaRequiredModule),
    },
    {
        path: 'ipvd',
        loadChildren: () => import('@pages/ipvd/ipvd.module').then(m => m.IpvdModule),
    },
    {
        path: 'embed/ipvd',
        loadChildren: () => import('@pages/ipvd/ipvd.module').then(m => m.IpvdModule),
    },
    {
        path: 'login',
        loadChildren: () => import('@pages/landing/landing.module').then(m => m.LandingModule),
    },
    {
        path: 'logout',
        loadChildren: () => import('@pages/landing/landing.module').then(m => m.LandingModule),
    },
    {
        path: 'push-notifications',
        loadChildren: () =>
            import('@pages/push-notifications/push-notifications.module').then(
                m => m.PushNotificationsModule,
            ),
    },
    {
        path: 'email-notifications',
        loadChildren: () =>
            import('@pages/email-notifications/email-notifications.module').then(
                m => m.EmailNotificationsModule,
            ),
    },
    {
        path: 'content/about',
        title: 'about',
        loadChildren: () => import('@pages/landing/landing.module').then(m => m.LandingModule),
    },
    {
        path: 'content',
        loadChildren: () => import('@pages/content/content.module').then(m => m.ContentModule),
    },
    {
        path: 'agreement',
        loadChildren: () => import('@pages/content/content.module').then(m => m.ContentModule),
    },
    {
        path: 'browser',
        loadChildren: () =>
            import('@pages/non-supported-browser/non-supported-browser.module').then(
                m => m.NonSupportedBrowserModule,
            ),
    },
    {
        path: 'cloud-authorize',
        loadChildren: () =>
            import('@pages/cloud-owner-authorization/cloud-owner-authorization.module').then(
                m => m.CloudOwnerAuthorizationModule,
            ),
    },
    {
        path: 'restore_password',
        canActivate: [RedirectAuthGuard],
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module), // It's a dummy load. Route guard actually redirect to the oauth app
    },
    {
        path: 'register',
        canActivate: [RedirectAuthGuard],
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module), // It's a dummy load. Route guard actually redirect to the oauth app
    },
    {
        path: '500',
        loadChildren: () => import('@pages/500/500.module').then(m => m.Nx500Module),
    },
    {
        path: '503',
        loadChildren: () => import('@pages/503/503.module').then(m => m.Nx503Module),
    },
    {
        path: '404',
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module),
    },
    {
        path: 'dashboard',
        canLoad: [FeatureGuard],
        canActivate: [AuthGuard],
        data: {
            flags: FeatureFlagStrings.dashboard,
            override: 'devServer',
        },
        loadChildren: () =>
            import('@pages/dashboard/dashboard.module').then(m => m.NxDashboardModule),
    },
    {
        path: '**',
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module),
    },
];

@NgModule({
    imports: [
        DirectivesModule,
        PipesModule,
        RouterModule.forRoot(lazyRoutes, {
            initialNavigation: 'enabledNonBlocking',
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
            enableTracing: false,
        }),
    ],
    declarations: [],
    providers: [
        ApplyGuard,
        AuthGuard,
        RedirectAuthGuard,
        {
            provide: TitleStrategy,
            useClass: NxPageTitleStrategy,
        },
    ],
    exports: [],
})
export class AppRoutingModule {}
