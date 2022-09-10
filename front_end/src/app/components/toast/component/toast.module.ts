import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxToast } from './toast.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxToast
    ],
    providers: [
        NxToast
    ],
    exports: [
        NxToast
    ]
})

export class ToastModule {}
