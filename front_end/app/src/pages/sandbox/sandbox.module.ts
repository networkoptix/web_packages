import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DialogsModule } from '@dialogs/dialogs.module';
import { DirectivesModule } from '@directives/directives.module';
import {
    VmsClientModule
} from '@pages/systems/view/vms-client/vms-client.module';
import { PipesModule } from '@src/pipes/pipes.module';
import { AuthGuard } from '@src/routeGuards';

import { NxGridLayoutModule } from '../layout/layout.module';

import {
    DynamicFormApplyExampleComponent
} from './dynamic-form-apply-example/dynamic-form-apply-example.component';
import {
    FormApplyExampleComponent
} from './form-apply-example/form-apply-example.component';
import { NxSandboxComponent } from './sandbox.component';
import {
    SectionApplyExampleComponent
} from './section-apply-example/section-apply-example.component';

const appRoutes: Routes = [
    {
        path: '', component: NxSandboxComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        TranslateModule,
        DialogsModule,
        CommonModule,
        FormsModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        NxGridLayoutModule,
        VmsClientModule,
        ReactiveFormsModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [
    ],
    declarations: [
        NxSandboxComponent,
        SectionApplyExampleComponent,
        FormApplyExampleComponent,
        DynamicFormApplyExampleComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSandboxComponent
    ]
})
export class SandboxModule {
}
