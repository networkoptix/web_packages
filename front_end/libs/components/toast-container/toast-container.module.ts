import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ToastModule } from '../toast-component/toast.module';

import { NxToastsContainer } from './toast.component';

@NgModule({
    imports: [CommonModule, ToastModule],
    declarations: [NxToastsContainer],
    providers: [NxToastsContainer],
    exports: [NxToastsContainer],
})
export class ToastContainerModule {}
