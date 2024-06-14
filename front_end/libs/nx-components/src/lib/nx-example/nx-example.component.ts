import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    booleanAttribute,
    computed,
    input,
    model,
    output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseComponent } from '../base-component';
import { generateCssVariableName } from '../theme-provider/color-generator';

/**
 * An example Component
 */
@Component({
    selector: 'nx-example',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './nx-example.component.html',
    styleUrl: './nx-example.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxExampleComponent extends BaseComponent {
    /**
     * A signal input example
     */
    testInput = input('test');

    /**
     * A signal output example
     */
    testOutput = output<string>();

    /**
     * A signal model example
     */

    testModel = model('testModel');

    /**
     * Theme input example
     */

    variant = input<'normal' | 'funky'>('normal');

    forceDark = input<boolean, unknown>(false, { transform: booleanAttribute });

    override themeOptionOverride = computed(() =>
        this.forceDark() ? { inverse: true } : undefined,
    );

    override variablesDeclaration = computed(() => {
        const isFunky = this.variant() === 'funky';
        return isFunky
            ? ({
                  '--example-background-color': generateCssVariableName(
                      'attentionSuccessGreen',
                      'light8',
                  ),
                  '--example-text-color': generateCssVariableName('core', 'dark8'),
              } as const)
            : ({
                  '--example-background-color': generateCssVariableName('core', 'dark7'),
                  '--example-text-color': generateCssVariableName('brand'),
              } as const);
    });
}
