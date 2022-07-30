import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HoverPreloadStrategy } from 'ngx-hover-preload';

import { LoginWebadminModule } from '@components/login-webadmin/login-webadmin.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@src/pipes/pipes.module';

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
        loadChildren: () => import('./systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path: 'settings',
        loadChildren: () => import('./systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path: 'monitoring',
        loadChildren: () => import('./monitoring/monitoring.module').then(m => m.NxMonitoringModule)
    },
    {
        path: 'view',
        loadChildren: () => import('./systems/view/view.module').then(m => m.NxSystemViewModule)
    },
    {
        path: 'health',
        loadChildren: () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path: 'api-tool',
        loadChildren: () => import('./api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path: 'bookmarks',
        loadChildren: () => import('./systems/bookmarks/bookmarks.module').then(m => m.BookmarksModule)
    },
    {
        path: 'cloud-authorize',
        loadChildren: () => import('./cloud-owner-authorization/cloud-owner-authorization.module').then(m => m.CloudOwnerAuthorizationModule)
    },
    {
        path: 'browser',
        loadChildren: () => import('./non-supported-browser/non-supported-browser.module').then(m => m.NonSupportedBrowserModule)
    },
    {
        path: '500',
        loadChildren: () => import('./500/500.module').then(m => m.Nx500Module)
    },
    {
        path: '404',
        loadChildren: () => import('./404/404.module').then(m => m.Nx404Module)
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
        AuthGuard
    ],
    exports: [
        RouterModule
    ]
})
export class WebadminPageModule {
}
