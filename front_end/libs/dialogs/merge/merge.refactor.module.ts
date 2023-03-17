import { CommonModule } from '@angular/common';
// import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
// import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
// import { PipesModule } from '@app/pipes/pipes.module';
// import { DirectivesModule } from '@directives/directives.module';

import { NxMergeAdminPasswordComponent } from './admin-password/admin-password.component';
import { NxMergeChoosePrimaryComponent } from './choose-primary/choose-primary.component';
import { NxMergeConfirmMergeComponent } from './confirm-merge/confirm-merge.component';
import { NxMergeGenericMergeComponent } from './generic-merge/generic-merge.component';
import { NxMergeComponent } from './merge.refactor.component';
import { NxMergeSelectSystemComponent } from './select-system/select-system.component';

// export const mergeRoutes: Routes = [
//     { path: '**', component: NxMergeComponent },
// ];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule,
        // HttpClientModule,
        // RouterModule.forChild(authorizedRoutes),
        AngularSvgIconModule.forRoot(),
        ComponentsModule,
        // DirectivesModule,
        // PipesModule,
    ],
    providers: [],
    declarations: [
        NxMergeComponent,
        NxMergeAdminPasswordComponent,
        NxMergeChoosePrimaryComponent,
        NxMergeConfirmMergeComponent,
        NxMergeGenericMergeComponent,
        NxMergeSelectSystemComponent,
    ],
    exports: [],
})
export class NxMergeModule {}
