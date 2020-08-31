import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';

import { ComponentsModule }     from '../../components/components.module';
import { DialogsModule }        from '../../dialogs/dialogs.module';
import { PipesModule }          from '../../pipes/pipes.module';
import { NxGridLayoutModule }   from '../layout/layout.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { AuthGuard }            from '../../routeGuards';
import { NxSandboxComponent }   from './sandbox.component';
import { SectionApplyExampleComponent } from './section-apply-example/section-apply-example.component';
import { FormApplyExampleComponent } from './form-apply-example/form-apply-example.component';

const appRoutes: Routes = [
    {
        path: 'sandbox', component: NxSandboxComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        DialogsModule,
        CommonModule,
        BrowserModule,
        UpgradeModule,
        NgbModule,
        FormsModule,
        ComponentsModule,
        PipesModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes),
        NxGridLayoutModule
    ],
    providers: [
    ],
    declarations: [
        NxSandboxComponent,
        SectionApplyExampleComponent,
        FormApplyExampleComponent
    ],
    bootstrap: [
    ],
    entryComponents: [
        NxSandboxComponent,
        NxSandboxComponent
    ],
    exports: [
        NxSandboxComponent
    ]
})
export class SandboxModule {
}
