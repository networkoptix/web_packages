import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
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
    NxSelectV2Module,
    NxTooltipDirective,
    NxPagePlaceholderV2Component,
    RouterModule,
    PipesModule,
] as const;
