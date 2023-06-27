import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxDropMenu } from '@components/dropdowns/drop-menu/drop-menu.component';

import { NxHeaderMainButtonComponent } from './main-button.component';

@NgModule({
    imports: [CommonModule, AngularSvgIconModule, NxDropMenu],
    declarations: [NxHeaderMainButtonComponent],
    providers: [NxHeaderMainButtonComponent],
    exports: [NxHeaderMainButtonComponent],
})
export class MainButtonModule {}
