import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {
    // ReactiveFormsModule,
    FormsModule
} from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

// import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { SearchableModule } from '@components/dropdowns/searchable/searchable.module';
import { PasswordModule } from '@components/password-input/password.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { DirectivesModule } from '@directives/directives.module';

import { AdvancedComponent } from './advanced/advanced.component';
import { BrokenSystemComponent } from './broken-system/broken-system.component';
import { ErrorComponent } from './error/error.component';
import { InitFailureComponent } from './init-failure/init-failure.component';
import { LocalFailureComponent } from './local-failure/local-failure.component';
import { LocalLoginComponent } from './local-login/local-login.component';
import { LocalSuccessComponent } from './local-success/local-success.component';
import { MergeFailedComponent } from './merge-failed/merge-failed.component';
import { MergeProcessComponent } from './merge-process/merge-process.component';
import { MergeComponent } from './merge/merge.component';
import { StartComponent } from './start/start.component';
import { SystemNameComponent } from './system-name/system-name.component';
import { WizardComponent } from './wizard.component';

export const authorizedRoutes: Routes = [
    {
        path: '',
        component: WizardComponent,
        children: [
            {
                path: 'advanced',
                component: AdvancedComponent
            }, {
                path: 'brokenSystem',
                component: BrokenSystemComponent
            }, {
                path: 'initFailure',
                component: InitFailureComponent
            }, {
                path: 'localFailure',
                component: LocalFailureComponent
            }, {
                path: 'localLogin',
                component: LocalLoginComponent
            }, {
                path: 'localSuccess',
                component: LocalSuccessComponent
            }, {
                path: 'merge',
                component: MergeComponent
            }, {
                path: 'mergeFailure',
                component: MergeFailedComponent
            }, {
                path: 'mergeProcess',
                component: MergeProcessComponent
            }, {
                path: 'start',
                component: StartComponent
            }, {
                path: 'systemName',
                component: SystemNameComponent
            }, {
                path: '**',
                component: ErrorComponent
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        TranslateModule,
        SharedComponentsModule,
        DirectivesModule,
        PipesModule,
        NxGenericDropdownModule,
        PasswordModule,
        RouterModule.forChild(authorizedRoutes),
        AngularSvgIconModule.forRoot(),
        FormsModule,
        SearchableModule
    ],
    providers: [
    ],
    declarations: [
        AdvancedComponent,
        ErrorComponent,
        LocalLoginComponent,
        LocalSuccessComponent,
        MergeComponent,
        MergeFailedComponent,
        MergeProcessComponent,
        StartComponent,
        SystemNameComponent,
        WizardComponent,
        MergeFailedComponent,
        LocalSuccessComponent,
        LocalFailureComponent,
        BrokenSystemComponent,
        InitFailureComponent,
    ],
    exports: [
        WizardComponent
    ]
})
export class WizardModule {
}
