import { NgModule }                  from '@angular/core';
import { Angular2CsvModule }         from 'angular2-csv';

import { DirectivesModule }          from '@directives/directives.module';
import { NonSupportedBrowserModule } from './non-supported-browser/non-supported-browser.module';
import { NxAccountModule }           from './account/account.module';
import { NxDebugModule }             from './debug/debug.module';
import { Nx500Module }               from './500/500.module';
import { RouterModule, Routes }      from '@angular/router';
import { QuicklinkStrategy }         from 'ngx-quicklink';
import { ApplyGuard }                from '@guards/applyGuard';
import { AuthGuard }                 from '@guards/authGuard';
import { PipesModule }               from '@src/pipes/pipes.module';

const lazyRoutes: Routes = [
    {
        path       : '',
        redirectTo : 'settings',
        pathMatch  : 'full'
    },
    {
        path       : 'advanced',
        redirectTo : 'settings/advanced',
        pathMatch  : 'full'
    },
    {
        path         : 'settings/advanced',
        loadChildren : () => import('./systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path         : 'settings',
        loadChildren : () => import('./systems/webadmin-system.module').then(m => m.NxSystemModule)
    },
    {
        path         : 'view',
        loadChildren : () => import('./systems/view/view.module').then(m => m.NxSystemViewModule)
    },
    {
        path         : 'health',
        loadChildren : () => import('./health/health.module').then(m => m.NxHealthModule)
    },
    {
        path         : 'api-tool',
        loadChildren : () => import('./api-tool/api-tool.module').then(m => m.NxApiToolModule)
    },
    {
        path         : 'bookmarks',
        loadChildren : () => import('./systems/bookmarks/bookmarks.module').then(m => m.BookmarksModule)
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
        NonSupportedBrowserModule,
        Angular2CsvModule,
        NxAccountModule,
        NxDebugModule,
        Nx500Module,
        RouterModule.forRoot(lazyRoutes, {
            initialNavigation         : true,
            scrollPositionRestoration : 'enabled',
            anchorScrolling           : 'enabled',
            enableTracing             : false,
            preloadingStrategy        : QuicklinkStrategy,
            onSameUrlNavigation       : 'reload'
        })
    ],
    declarations: [
    ],
    providers: [
        ApplyGuard,
        AuthGuard
    ],
    exports: [
        NonSupportedBrowserModule,
        Angular2CsvModule,
        NxDebugModule,
        Nx500Module,
        RouterModule
    ]
})
export class WebadminPageModule {
}
