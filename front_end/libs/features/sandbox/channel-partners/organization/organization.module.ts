import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { ReactiveComponentModule } from '@ngrx/component';

import { NxOrganizationComponent } from './organization.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule,
        // TranslateModule,

        ReactiveComponentModule,
    ],
    declarations: [
        NxOrganizationComponent,
    ],
    providers: [],
    exports: [
        NxOrganizationComponent,
    ]
})
export class NxOrganizationModule {}
