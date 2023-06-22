import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DirectivesModule } from '@directives/directives.module';

import { NxNavLocationDropdown } from './nav.component';

@NgModule({
    imports: [CommonModule, DirectivesModule],
    declarations: [NxNavLocationDropdown],
    providers: [NxNavLocationDropdown],
    exports: [NxNavLocationDropdown],
})
export class NavModule {}
