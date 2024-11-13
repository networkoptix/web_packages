import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanDeactivateFn, RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { MenuModule } from '@menu/menu.module';
import { NxAccountComponent } from '@pages/account/account.component';
import { NxBetaSettingsBetaComponent } from '@pages/account/beta/beta.component';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';
import { NxAccountPasswordModule } from '@pages/account/password/password.module';
import { NxAccountSecurityComponent } from '@pages/account/security/security.component';
import { NxAccountSecurityModule } from '@pages/account/security/security.module';
import { NxAccountSettingsComponent } from '@pages/account/settings/settings.component';
import { NxAccountSettingsModule } from '@pages/account/settings/settings.module';
import { PipesModule } from '@pipes/pipes.module';
import { NxMenuProjectionDirective } from 'nx-components';

const RequiresReloadGuard: CanDeactivateFn<NxBetaSettingsBetaComponent> = (
    component,
    _currentRoute,
    _currentState,
    nextState,
) => {
    if (component.requiresReload$$()) {
        window.location.href = nextState.url;
    }
    return true;
};

const appRoutes: Routes = [
    {
        path: '',
        component: NxAccountComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                title: 'account',
                component: NxAccountSettingsComponent,
                canDeactivate: [ApplyGuard, RequiresReloadGuard],
            },
            {
                path: 'password',
                title: 'changePassword',
                component: NxAccountPasswordComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'security',
                title: 'twofa',
                component: NxAccountSecurityComponent,
                canDeactivate: [ApplyGuard],
            },
            {
                path: 'beta-features',
                title: 'betaFeatures',
                component: NxBetaSettingsBetaComponent,
                canDeactivate: [ApplyGuard, RequiresReloadGuard],
            },
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NgxTranslateCutModule,
        NxFooterComponent,
        MenuModule,
        NxAccountSettingsModule,
        NxAccountPasswordModule,
        NxAccountSecurityModule,
        PipesModule,
        NxPreLoaderComponent,
        NxTooltipDirective,
        NxMenuProjectionDirective,
        NxBetaSettingsBetaComponent,
    ],
    declarations: [NxAccountComponent],
})
export class NxAccountModule {}
