import { NgModule } from '@angular/core';

import { NxFormObserverDirective } from '../form-observer.directive';

import { NxApplyV3Component } from './apply-v3.component';

const imports = [NxFormObserverDirective, NxApplyV3Component];

@NgModule({
    imports,
    exports: imports,
})
export class NxApplyV3Module {}
