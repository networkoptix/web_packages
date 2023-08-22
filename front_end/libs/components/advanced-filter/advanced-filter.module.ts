import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { PipesModule } from '@pipes/pipes.module';

import { NxAdvancedFilterComponent } from './advanced-filter.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        PipesModule,
        CheckboxModule,

        NxClickElsewhereDirective
    ],
    declarations: [
        NxAdvancedFilterComponent
    ],
    providers: [
        NxAdvancedFilterComponent
    ],
    exports: [
        NxAdvancedFilterComponent
    ]
})

export class AdvancedFilterModule {}
