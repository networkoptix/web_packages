import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';

import { NxOrganizationComponent } from './organization.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule.forRoot(),
        // TranslateModule,
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
