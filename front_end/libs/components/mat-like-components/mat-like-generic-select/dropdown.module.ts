import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { PipesModule } from '@pipes/pipes.module';

import { NxMatLikeGenericDropdown } from './dropdown.component';
import { NxGenericDropdownItemSVG } from './item-icon/item-icon.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
    ],
    declarations: [NxMatLikeGenericDropdown, NxGenericDropdownItemSVG],
    exports: [NxMatLikeGenericDropdown],
})
export class NxMatLikeGenericDropdownModule {}
