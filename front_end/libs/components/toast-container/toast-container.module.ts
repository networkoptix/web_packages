import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxToast } from '@components/toast-component/toast.component';

import { NxToastsContainer } from './toast.component';

@NgModule({
    imports: [CommonModule, NxToast],
    declarations: [NxToastsContainer],
    providers: [NxToastsContainer],
    exports: [NxToastsContainer],
})
export class ToastContainerModule {}
