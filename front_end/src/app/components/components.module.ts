import { CdkStepperModule } from '@angular/cdk/stepper';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NgModule } from '@angular/core';
import { TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { SharedComponentsModule } from '@components/shared-components.module';
// import { HeaderModule } from './header/header.module';
import {
    NxImageComponent
} from '@pages/health/table-components/image/image.component';

import { ComponentsCommonModule } from './components-common.module';
import { ComponentsCoreModule } from './components-core.module';
import { NxGenericDropdownModule } from './dropdowns/generic/dropdown.module';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        ComponentsCommonModule,
        SharedComponentsModule,
    ],
    declarations: [
        NxImageComponent,
    ],
    providers: [
        { provide: TINYMCE_SCRIPT_SRC, useValue: 'static/tinymce/tinymce.min.js' },
        NxImageComponent,
    ],
    exports: [
        NxGenericDropdownModule,
        NxImageComponent,
        SharedComponentsModule,
        // HeaderModule,
        CdkStepperModule,
        TextFieldModule,
        ComponentsCoreModule,
        ComponentsCommonModule,
        SharedComponentsModule,
    ]
})
export class ComponentsModule {
}
