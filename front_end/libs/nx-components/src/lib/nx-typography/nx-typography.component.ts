import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseComponent } from '../base-component';

@Component({
    selector: 'nx-typography',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './nx-typography.component.html',
    styleUrl: './nx-typography.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxTypographyComponent extends BaseComponent {
    override variablesDeclaration = computed(() => ({}));
}
