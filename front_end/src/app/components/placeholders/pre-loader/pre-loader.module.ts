import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxPreLoaderComponent } from './pre-loader.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxPreLoaderComponent
    ],
    providers: [
        NxPreLoaderComponent
    ],
    exports: [
        NxPreLoaderComponent
    ]
})

export class PreLoaderModule {}
