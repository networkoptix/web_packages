import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxButtonComponent } from '@components/button/button.component';
import { nxConfig } from '@services/nx-config/config';

@Component({
    selector: 'nx-shared-bookmark-password',
    standalone: true,
    styleUrls: ['shared-bookmark-password.component.scss'],
    templateUrl: 'shared-bookmark-password.component.html',
    imports: [CommonModule, NxButtonComponent, FormsModule],
})
export class SharedBookmarkPasswordComponent {
    @Output() onConfirmPressed = new EventEmitter<string>();
    @Input() password: string;
    @Output() passwordChange = new EventEmitter<string>();

    CONFIG = nxConfig;

    handleConfirmPressed(): void {
        this.onConfirmPressed.emit(this.password);
    }
}
