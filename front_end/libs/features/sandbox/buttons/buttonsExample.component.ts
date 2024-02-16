import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';

@Component({
    selector: 'nx-buttons-example',
    templateUrl: 'buttonsExample.component.html',
    styleUrls: ['buttonsExample.component.scss'],
    standalone: true,
    imports: [CommonModule, NxButtonComponent],
})
export class NxButtonsExampleComponent {
    ButtonType = ButtonType;

    onClick(): void {
        console.log('Example button clicked!');
    }
}
