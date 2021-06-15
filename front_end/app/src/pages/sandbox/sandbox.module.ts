import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes }             from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule }                        from '@ng-bootstrap/ng-bootstrap';

import { ComponentsModule }     from '../../components/components.module';
import { DialogsModule }        from '../../dialogs/dialogs.module';
import { PipesModule }          from '../../pipes/pipes.module';
import { NxGridLayoutModule }   from '../layout/layout.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { AuthGuard }            from '../../routeGuards';
import { NxSandboxComponent }   from './sandbox.component';
import { SectionApplyExampleComponent } from './section-apply-example/section-apply-example.component';
import { FormApplyExampleComponent } from './form-apply-example/form-apply-example.component';
import { DynamicFormApplyExampleComponent } from './dynamic-form-apply-example/dynamic-form-apply-example.component';
import { VmsClientModule } from '@pages/systems/view/vms-client/vms-client.module';

const appRoutes: Routes = [
    {
        path: '', component: NxSandboxComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        DialogsModule,
        CommonModule,
        NgbModule,
        FormsModule,
        ComponentsModule,
        PipesModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        NxGridLayoutModule,
        VmsClientModule,
        ReactiveFormsModule
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
