import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxAdvancedFilterComponent } from './advanced-filter.component';

@NgModule({
    imports: [CommonModule, FormsModule, PipesModule, CheckboxModule],
    declarations: [NxAdvancedFilterComponent],
    providers: [NxAdvancedFilterComponent],
    exports: [NxAdvancedFilterComponent],
})
export class AdvancedFilterModule {}
