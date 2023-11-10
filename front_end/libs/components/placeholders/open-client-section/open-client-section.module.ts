import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxVmsClientTextComponent } from '@components/open-vms-client/vms-client-text/vms-client-text.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';

import { NxOpenClientSectionPlaceholderComponent } from './open-client-section.component';

@NgModule({
    imports: [AngularSvgIconModule, NxAddSvgSrcDirective, NxVmsClientTextComponent],
    declarations: [NxOpenClientSectionPlaceholderComponent],
    providers: [NxOpenClientSectionPlaceholderComponent],
    exports: [NxOpenClientSectionPlaceholderComponent],
})
export class OpenClientSectionPlaceholderModule {}
