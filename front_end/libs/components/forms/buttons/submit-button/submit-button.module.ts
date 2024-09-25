import { NgModule } from '@angular/core';

import { NxFormObserverDirective } from '@components/forms/form-observer.directive';

import { NxSubmitButtonComponent } from './submit-button.component';

const exports = [NxSubmitButtonComponent, NxFormObserverDirective];

@NgModule({
    imports: exports,
    exports,
})
export class NxSubmitButtonModule {}
