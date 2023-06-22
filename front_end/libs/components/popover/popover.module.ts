import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxPopoverComponent } from './popover/popover.component';
import { NxPopoverService } from './popover.service';

@NgModule({
    declarations: [NxPopoverComponent],
    imports: [CommonModule, OverlayModule, PortalModule],
    providers: [NxPopoverService, NxPopoverComponent],
})
export class PopoverModule {}
