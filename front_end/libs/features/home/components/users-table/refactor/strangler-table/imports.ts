import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxDropdownModule } from '@components/dropdownV2/dropdown.module';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { PipesModule } from '@pipes/pipes.module';

export const imports = [
    AngularSvgIconModule,
    CommonModule,
    TranslateModule,
    NxCheckboxComponent,
    NxBaseTableComponent,
    NxAddSvgSrcDirective,
    NxDropdownModule,
    NxTooltipDirective,
    NxPagePlaceholderV2Component,
    RouterModule,
    PipesModule,
] as const;
