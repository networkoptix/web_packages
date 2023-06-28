import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { NxAccountComponent } from '@pages/account/account.component';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';
import { NxAccountPasswordModule } from '@pages/account/password/password.module';
import { NxAccountSecurityComponent } from '@pages/account/security/security.component';
import { NxAccountSecurityModule } from '@pages/account/security/security.module';
import { NxAccountSettingsComponent } from '@pages/account/settings/settings.component';
import { NxAccountSettingsModule } from '@pages/account/settings/settings.module';

import { TypeResolver } from './type-resolver';

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
                canDeactivate: [ApplyGuard],
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
        DirectivesModule,
        NxFooterComponent,
        MenuModule,
        NxAccountSettingsModule,
        NxAccountPasswordModule,
        NxAccountSecurityModule,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [TypeResolver],
    declarations: [NxAccountComponent],
    bootstrap: [],
    exports: [],
})
export class NxAccountModule {}
