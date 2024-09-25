import { NgModule } from '@angular/core';

import { NxFormObserverDirective } from '@components/forms/form-observer.directive';

import { NxAsyncSubmitButtonComponent } from './async-submit-button.component';

const exports = [NxAsyncSubmitButtonComponent, NxFormObserverDirective];

@NgModule({
    imports: exports,
    exports,
})
export class NxAsyncSubmitButtonModule {}
