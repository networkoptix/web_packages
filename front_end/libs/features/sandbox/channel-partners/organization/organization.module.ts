import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LetDirective, PushPipe } from '@ngrx/component';

import { NxOrganizationComponent } from './organization.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
        RouterModule,
        // AngularSvgIconModule,
        // TranslateModule,

        LetDirective,
        PushPipe,
    ],
    declarations: [NxOrganizationComponent],
    providers: [],
    exports: [NxOrganizationComponent],
})
export class NxOrganizationModule {}
