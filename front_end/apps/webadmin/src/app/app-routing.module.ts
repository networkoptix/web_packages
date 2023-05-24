import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';
import { HoverPreloadStrategy } from 'ngx-hover-preload';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxPageTitleStrategy } from '@app/resolvers/title-resolver';
import { LoginWebadminModule } from '@components/login-webadmin/login-webadmin.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';

// import { NxDebugModule } from './debug/debug.module';

const lazyRoutes: Routes = [
    {
        path: '',
        redirectTo: 'settings',
        pathMatch: 'full'
    },
    {
        path: 'advanced',
        redirectTo: 'settings/advanced',
        pathMatch: 'full'
    },
    {
        path: 'settings/advanced',
        loadChildren: () => import('@pages/systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path: 'settings',
        loadChildren: () => import('@pages/systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path: 'monitoring',
        loadChildren: () => import('@pages/monitoring/monitoring.module').then(m => m.NxMonitoringModule)
    },
    {
        path: 'view',
        loadChildren: () => import('@pages/systems/view/view.module').then(m => m.NxSystemViewModule)
    },
    {
        path: 'health',
        loadChildren: () => import('@pages/health/health.module').then(m => m.NxHealthModule)
    },
    {
        path: 'api-tool',
        loadChildren: () => import('@pages/api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path: 'server-documentation',
        loadChildren: () => import('@pages/server-documentation/server-documentation.module').then(m => m.NxServerDocumentationModule),
        pathMatch: 'full'
    },
    {
        path: 'bookmarks',
        loadChildren: () => import('@pages/systems/bookmarks/bookmarks.module').then(m => m.BookmarksModule)
    },
    {
        path: 'cloud-authorize',
        loadChildren: () => import('@pages/cloud-owner-authorization/cloud-owner-authorization.module').then(m => m.CloudOwnerAuthorizationModule)
    },
    {
        path: 'browser',
        loadChildren: () => import('@pages/non-supported-browser/non-supported-browser.module').then(m => m.NonSupportedBrowserModule)
    },
    {
        path: '500',
        loadChildren: () => import('@pages/500/500.module').then(m => m.Nx500Module)
    },
    {
        path: '404',
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module)
    },
    {
        path: '**',
        loadChildren: () => import('@pages/404/404.module').then(m => m.Nx404Module)
    }
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
            preloadingStrategy: HoverPreloadStrategy,
            onSameUrlNavigation: 'reload',
            relativeLinkResolution: 'legacy'
        }),
        LoginWebadminModule
    ],
    declarations: [],
    providers: [
        ApplyGuard,
        AuthGuard,
        {
            provide: TitleStrategy,
            useClass: NxPageTitleStrategy
        },
    ],
    exports: [
        RouterModule
    ]
})
export class AppRoutingModule {
}
