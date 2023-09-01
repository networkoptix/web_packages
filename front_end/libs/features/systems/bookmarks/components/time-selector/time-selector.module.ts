import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';

import { NxTimeSelectorComponent } from './time-selector.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        // TranslateModule,
        CdkMenuModule,
        NxAddSvgSrcDirective,
    ],
    declarations: [NxTimeSelectorComponent],
    providers: [],
    exports: [NxTimeSelectorComponent],
})
export class NxTimeSelectorModule {}
