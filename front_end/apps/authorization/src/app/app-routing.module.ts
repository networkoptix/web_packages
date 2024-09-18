import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'redirect-oauth',
        loadChildren: () =>
            import('./oauth-redirect/oauth-redirect.module').then(m => m.NxOAuthRedirectModule),
    },
    {
        path: 'authorize',
        loadChildren: () => import('./components/authorize.module').then(m => m.NxAuthorizeModule),
    },
    {
        path: '**',
        redirectTo: '/authorize',
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {})],
    exports: [RouterModule],
})
export class AppRoutingModule {}
