import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxMatLikeInputModule } from '@components/mat-like-components/mat-like-input/input.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxMatLikePasswordComponent } from './password.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        NxMatLikeInputModule,
    ],
    declarations: [NxMatLikePasswordComponent],
    providers: [NxMatLikePasswordComponent],
    exports: [NxMatLikePasswordComponent],
})
export class NxMatLikePasswordModule {}
