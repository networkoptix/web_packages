import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxMultiSelectDropdown } from './multi-select.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        CheckboxModule,
        DirectivesModule,
        PipesModule
    ],
    declarations: [
        NxMultiSelectDropdown
    ],
    providers: [
        NxMultiSelectDropdown
    ],
    exports: [
        NxMultiSelectDropdown
    ]
})

export class MultiSelectModule {}
