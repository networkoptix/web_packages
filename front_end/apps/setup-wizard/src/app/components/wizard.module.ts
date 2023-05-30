import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
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

export const setupWizardRoutes: Routes = [
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
                path: 'mergeFailed',
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
        FormsModule,
        TranslateModule,
        RouterModule.forChild(setupWizardRoutes),
        AngularSvgIconModule.forRoot(),
        DirectivesModule,
        PipesModule,
        PreLoaderModule
    ],
    providers: [
    ],
    declarations: [
        ErrorComponent,
        LocalSuccessComponent,
        MergeFailedComponent,
        StartComponent,
        SystemNameComponent,
        WizardComponent,
        MergeFailedComponent,
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
