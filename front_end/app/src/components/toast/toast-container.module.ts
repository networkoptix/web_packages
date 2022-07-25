import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxToastsContainer } from './toast.container';
import { ToastModule } from './toast.module';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ToastModule,
    ],
    declarations: [
        NxToastsContainer
    ],
    providers: [
        NxToastsContainer
    ],
    exports: [
        NxToastsContainer
    ]
})

export class ToastContainerModule {}
