import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ClientButtonModule } from '@components/open-client-button/client-button.module';

import { NxOpenClientSectionPlaceholderComponent } from './open-client-section.component';

@NgModule({
    imports: [AngularSvgIconModule, ClientButtonModule],
    declarations: [NxOpenClientSectionPlaceholderComponent],
    providers: [NxOpenClientSectionPlaceholderComponent],
    exports: [NxOpenClientSectionPlaceholderComponent],
})
export class OpenClientSectionPlaceholderModule {}
