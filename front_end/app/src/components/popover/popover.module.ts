import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxPopoverService } from '@components/popover/popover.service';

import { NxPopoverComponent } from './popover/popover.component';

@NgModule({
    declarations: [NxPopoverComponent],
    imports: [
        CommonModule,
        OverlayModule,
        PortalModule
    ],
    providers: [
        NxPopoverService
    ],
    entryComponents: [NxPopoverComponent]
})
export class PopoverModule {
}
