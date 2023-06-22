import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LetDirective, PushPipe } from '@ngrx/component';
// import { FormsModule } from '@angular/forms';

import { NxChannelPartnerComponent } from './channel-partner.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        RouterModule,
        // AngularSvgIconModule,
        // TranslateModule,

        LetDirective,
        PushPipe,
    ],
    declarations: [NxChannelPartnerComponent],
    providers: [],
    exports: [NxChannelPartnerComponent],
})
export class NxChannelPartnerModule {}
