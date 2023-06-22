import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NavDropdownModule } from '../nav-dropdown/nav-dropdown.module';

import { NxTabsComponent } from './tabs.component';

@NgModule({
    imports: [CommonModule, RouterModule, NavDropdownModule],
    declarations: [NxTabsComponent],
    providers: [NxTabsComponent],
    exports: [NxTabsComponent],
})
export class TabsModule {}
