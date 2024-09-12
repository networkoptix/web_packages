import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BaseComponent } from '../base-component';
import { generateCssVariableName } from '../theme-provider';

/**
 * Wrapper for demo using current color for svg.
 *
 * Create new component or directive and remove the example if we end up using this pattern.
 */
@Component({
    selector: 'nx-current-color-example',
    standalone: true,
    imports: [CommonModule],
    template: `<ng-content />`,
    styles: `
        :host {
            display: inline-flex;
            padding: 16px;
            gap: 16px;
            align-items: center;
            color: var(--base);
            background: var(--base-bg);
            border: 2px solid currentColor;
            border-radius: 16px;
            align-content: center;
            font-size: 48px;
            nx-icon {
                height: 108px;
            }
            &:hover {
                color: var(--hover);
                background: var(--hover-bg);
            }
            &:active {
                color: var(--active);
                background: var(--active-bg);
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxCurrentColorExampleComponent extends BaseComponent {
    override variablesDeclaration = input(
        {
            base: generateCssVariableName('core', 'light10'),
            hover: generateCssVariableName('core', 'light8'),
            active: generateCssVariableName('core', 'light12'),
            'base-bg': generateCssVariableName('core', 'dark6'),
            'hover-bg': generateCssVariableName('core', 'dark7'),
            'active-bg': generateCssVariableName('core', 'dark4'),
        },
        { alias: 'styles' },
    );
}
