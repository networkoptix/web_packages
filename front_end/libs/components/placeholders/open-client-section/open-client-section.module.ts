import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';

import { NxOpenClientSectionPlaceholderComponent } from './open-client-section.component';

@NgModule({
    imports: [AngularSvgIconModule, NxClientButtonComponent],
    declarations: [NxOpenClientSectionPlaceholderComponent],
    providers: [NxOpenClientSectionPlaceholderComponent],
    exports: [NxOpenClientSectionPlaceholderComponent],
})
export class OpenClientSectionPlaceholderModule {}
