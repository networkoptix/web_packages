import { NgModule } from '@angular/core';

import { NxControlMessageComponent } from './control-messages/control-message/control-message.component';
import { NxControlMessagesComponent } from './control-messages/control-messages.component';
import { NxFormFieldComponent } from './form-field/form-field.component';
import { NxFormObserverDirective } from './form-observer.directive';
import { NxLabelComponent } from './label/label.component';

const imports = [
    NxFormFieldComponent,
    NxLabelComponent,
    NxControlMessagesComponent,
    NxControlMessageComponent,
    NxFormObserverDirective,
];

@NgModule({
    imports,
    exports: imports,
})
export class NxFormFieldModule {}
