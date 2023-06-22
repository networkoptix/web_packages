import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DropMenuModule } from '@components/dropdowns/drop-menu/drop-menu.module';

import { NxHeaderMainButtonComponent } from './main-button.component';

@NgModule({
    imports: [CommonModule, AngularSvgIconModule, DropMenuModule],
    declarations: [NxHeaderMainButtonComponent],
    providers: [NxHeaderMainButtonComponent],
    exports: [NxHeaderMainButtonComponent],
})
export class MainButtonModule {}
