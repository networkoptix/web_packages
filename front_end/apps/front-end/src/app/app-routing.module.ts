import { inject, NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';

// import { HoverPreloadStrategy } from 'ngx-hover-preload';

import { NxLayoutViewComponent } from '@components/layout-view/layout-view.component';
import { AuthGuard } from '@guards/authGuard';
import { BuildGuard } from '@guards/buildGuard';
import { ChannelPartnerGuard } from '@guards/channelPartnerGuard';
import { disableLoggingHandler } from '@guards/disableLogging';
import { FeatureGuardActivate, FeatureGuardMatch } from '@guards/feature.guard';
import { OrgStateGuard } from '@guards/orgStateGuard';
import { RedirectAuthGuard } from '@guards/redirectAuthGuard';
import { SandboxCloudGuard } from '@guards/sandbox.guard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { PipesModule } from '@pipes/pipes.module';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';
import { NxPageTitleStrategy } from '@resolvers/title-resolver';
import { NxMenusService } from '@services/menus.service';
import { FeatureFlagStrings } from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemService } from '@services/system.service/system.service';

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
    {
        path: 'theme-generator',
        loadChildren: () =>
            import('@pages/theme-generator-demo/theme-generator-demo.module').then(
                m => m.NxThemeGeneratorDemoModule,
            ),
        canMatch: [FeatureGuardActivate],
        canActivate: [AuthGuard],
        data: {
            flag: FeatureFlagStrings.themeGenerator,
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
        path: 'home',
        canMatch: [FeatureGuardActivate],
        loadChildren: () => import('@pages/home/home.module').then(m => m.NxHomeModule),
        data: {
            flag: FeatureFlagStrings.channelPartners,
        },
    },
    {
        path: 'systems/no-access',
        loadComponent: () =>
            import('@components/placeholders/page/page-placeholder.component').then(
                c => c.NxPagePlaceholderComponent,
            ),
        resolve: {
            type: () => 'FAILED_TO_ACCESS_SYSTEM',
            withFooter: () => true,
            showMainButton: () => true,
        },
    },
    {
        path: 'systems/:systemId/no-access/:systemName',
        loadComponent: () =>
            import('@components/placeholders/no-access/no-access.component').then(
                c => c.NxSystemNoAccessComponent,
            ),
    },
    {
        path: 'systems',
        children: [
            {
                path: ':systemId',
                canActivate: [AuthGuard, OrgStateGuard, SystemGuard, TwofaGuard],
                canDeactivate: [
                    activated => {
                        if (!(activated instanceof NxLayoutViewComponent)) {
                            // The change where current system could now be undefined seems to break stuff with layouts
                            // Not sure if this change could affect other features, if so we might want to revert the
                            // change that added undefined.
                            inject(NxSystemService).removeCurrentSystem();
                        }
                        return true;
                    },
                ],
                children: [
                    {
                        path: 'view',
                        loadChildren: () =>
                            import('@pages/systems/view/view.module').then(
                                m => m.NxSystemViewModule,
                            ),
                    },
                    {
                        path: 'layouts',
                        loadChildren: () =>
                            import('@pages/systems/layout-view/layout-view.module').then(
                                m => m.NxLayoutViewModule,
                            ),
                        canMatch: [FeatureGuardMatch],
                        data: {
                            flag: FeatureFlagStrings.layouts,
                            disableLogging: true,
                        },
                    },
                    {
                        path: 'services',
                        loadComponent: () =>
                            import('@pages/systems/services/services.component').then(
                                c => c.NxServicesComponent,
                            ),
                        canMatch: [FeatureGuardMatch],
                        canDeactivate: [
                            () => {
                                inject(NxMenusService).channelPartnerServiceMode$.next(false);
                                return true;
                            },
                        ],
                        title: SystemTitleResolver,
                        data: {
                            flag: FeatureFlagStrings.channelPartnersChangeServicesUI,
                        },
                    },
                    {
                        path: 'health',
                        loadChildren: () =>
                            import('@pages/health/health.module').then(m => m.NxHealthModule),
                    },
                    {
                        path: 'bookmarks',
                        canMatch: [FeatureGuardMatch],
                        data: {
                            flag: FeatureFlagStrings.bookmarks,
                        },
                        loadChildren: () =>
                            import('@pages/systems/bookmarks/bookmarks.module').then(
                                m => m.BookmarksModule,
                            ),
                    },
                    {
                        path: 'monitoring',
                        loadChildren: () =>
                            import('@pages/monitoring/monitoring.module').then(
                                m => m.NxMonitoringModule,
                            ),
                    },
                    {
                        path: '',
                        loadChildren: () =>
                            import('@pages/systems/settings/settings.module').then(
                                m => m.NxSettingsModule,
                            ),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    },
                ],
            },
            // Order matters when going to systems. When you click on a system in an org
            // it will get stuck on the home page.
            {
                path: '',
                title: 'systems',
                canMatch: [ChannelPartnerGuard],
                loadChildren: () =>
                    import('@pages/systems/list/list.module').then(m => m.NxSystemsListModule),
            },
        ],
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
        loadChildren: () =>
            !nxConfig.featureFlags.enhancedDownloads
                ? import('@pages/download/download.module').then(m => m.DownloadModule)
                : import('@pages/download-updated/downloads-releases.module').then(
                      m => m.NxDownloadsReleasesModuleNew,
                  ),
    },
    {
        path: 'downloads',
        canMatch: [BuildGuard],
        loadChildren: () =>
            import('@pages/download-history/download-history.module').then(
                m => m.DownloadHistoryModule,
            ),
    },
    {
        path: 'sandbox',
        loadChildren: () => import('@pages/sandbox/sandbox.module').then(m => m.SandboxModule),
        canLoad: [SandboxCloudGuard],
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
        canMatch: [FeatureGuardActivate],
        canActivate: [AuthGuard],
        data: {
            flag: FeatureFlagStrings.customClients,
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
        path: 'cookie-policy',
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
        path: 'share',
        loadChildren: () =>
            import('@pages/shared-bookmark/shared-bookmark.module').then(
                m => m.SharedBookmarkModule,
            ),
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
    // {
    //     path: 'dashboard',
    //     canMatch: [FeatureGuardActivate],
    //     canActivate: [AuthGuard],
    //     data: {
    //         flag: FeatureFlagStrings.dashboard,
    //     },
    //     loadChildren: () =>
    //         import('@pages/dashboard/dashboard.module').then(m => m.NxDashboardModule),
    // },
    {
        path: 'reports',
        canMatch: [FeatureGuardActivate],
        canActivate: [AuthGuard],
        data: {
            flag: FeatureFlagStrings.channelPartnersReportsUI,
        },
        loadChildren: () => import('@pages/reports/reports.module').then(m => m.NxReportsModule),
    },
    {
        path: '**',
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module),
    },
];

@NgModule({
    imports: [
        PipesModule,
        RouterModule.forRoot(disableLoggingHandler(lazyRoutes), {
            initialNavigation: 'enabledNonBlocking',
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
            enableTracing: false,
            bindToComponentInputs: true,
            enableViewTransitions: false,
        }),
    ],
    declarations: [],
    providers: [
        {
            provide: TitleStrategy,
            useClass: NxPageTitleStrategy,
        },
    ],
    exports: [],
})
export class AppRoutingModule {}
