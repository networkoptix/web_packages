import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { ToastModule } from './component/toast.module';
import { NxToastsContainer } from './toast.container';

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
