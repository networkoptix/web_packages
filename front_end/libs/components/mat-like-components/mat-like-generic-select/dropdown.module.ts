import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxMatLikeGenericDropdown } from './dropdown.component';
import { NxGenericDropdownItemSVG } from './item-icon/item-icon.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
        PipesModule,
    ],
    declarations: [
        NxMatLikeGenericDropdown,
        NxGenericDropdownItemSVG,
    ],
    exports: [NxMatLikeGenericDropdown]
})
export class NxMatLikeGenericDropdownModule {}
