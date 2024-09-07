import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { nxConfig } from '@services/nx-config/config';

@Component({
    selector: 'nx-button-loading-dots',
    templateUrl: 'button-loading-dots.component.html',
    styleUrls: ['button-loading-dots.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    host: {
        class: 'loading-dots',
        '[class.loading-dots--light-default]': "!CONFIG.isDarkTheme && buttonColor() === 'default'",
    },
})
export class NxButtonLoadingDotsComponent {
    buttonColor = input.required<'primary' | 'danger' | 'default'>();
    CONFIG = nxConfig;
}
