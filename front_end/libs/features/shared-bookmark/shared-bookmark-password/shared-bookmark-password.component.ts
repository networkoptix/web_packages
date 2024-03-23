import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxButtonComponent } from '@components/button/button.component';
import { nxConfig } from '@services/nx-config/config';

@Component({
    selector: 'nx-shared-bookmark-password',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['shared-bookmark-password.component.scss'],
    templateUrl: 'shared-bookmark-password.component.html',
    imports: [CommonModule, NxButtonComponent, FormsModule, TranslateModule],
})
export class SharedBookmarkPasswordComponent {
    @Output() onConfirmPressed = new EventEmitter<string>();
    password = model.required<string>();
    passwordError = model(false);
    disabled = model(false);

    CONFIG = nxConfig;

    handleConfirmPressed(): void {
        if (this.password().length > 0) {
            this.passwordError.set(false);
            this.disabled.set(true);
            this.onConfirmPressed.emit(this.password());
        } else {
            this.passwordError.set(true);
        }
    }
}
