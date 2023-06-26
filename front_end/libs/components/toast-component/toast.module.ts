import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '@pipes/pipes.module';

import { NxToast } from './toast.component';

@NgModule({
    imports: [CommonModule, PipesModule],
    declarations: [NxToast],
    providers: [NxToast],
    exports: [NxToast],
})
export class ToastModule {}
