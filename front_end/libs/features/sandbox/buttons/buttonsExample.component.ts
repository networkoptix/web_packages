import { Component } from '@angular/core';

import { ButtonType } from '@components/button/button.component.types';

@Component({
    selector: 'nx-buttons-example',
    templateUrl: 'buttonsExample.component.html',
    styleUrls: ['buttonsExample.component.scss'],
})
export class NxButtonsExampleComponent {
    ButtonType = ButtonType;

    onClick(): void {
        console.log('Example button clicked!');
    }
}
