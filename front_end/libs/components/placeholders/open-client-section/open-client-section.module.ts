import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';

import { NxOpenClientSectionPlaceholderComponent } from './open-client-section.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        ClientButtonModule,
    ],
    declarations: [
        NxOpenClientSectionPlaceholderComponent
    ],
    providers: [
        NxOpenClientSectionPlaceholderComponent
    ],
    exports: [
        NxOpenClientSectionPlaceholderComponent
    ]
})

export class OpenClientSectionPlaceholderModule {}
