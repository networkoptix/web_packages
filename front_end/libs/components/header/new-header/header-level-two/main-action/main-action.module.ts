import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxMainActionComponent } from './main-action.component';

@NgModule({
    imports: [CommonModule, AngularSvgIconModule, TranslateModule],
    declarations: [NxMainActionComponent],
    providers: [NxMainActionComponent],
    exports: [NxMainActionComponent],
})
export class MainActionModule {}
