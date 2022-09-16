import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { NxHTMLComponent } from './html-input.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        PreLoaderModule,
    ],
    declarations: [
        NxHTMLComponent
    ],
    providers: [
        NxHTMLComponent
    ],
    exports: [
        NxHTMLComponent
    ]
})

export class HtmlInputModule {}
