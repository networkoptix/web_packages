import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
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
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { TypeResolver } from './type-resolver';

const appRoutes: Routes = [
    {
        path: '',
        component: NxAccountComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: NxAccountSettingsComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'password',
                component: NxAccountPasswordComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'security',
                component: NxAccountSecurityComponent,
                canDeactivate: [ApplyGuard]
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        NxAccountSettingsModule,
        NxAccountPasswordModule,
        NxAccountSecurityModule,

        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers: [
        TypeResolver
    ],
    declarations: [
        NxAccountComponent
    ],
    bootstrap: [],
    exports: []
})
export class NxAccountModule {
}
