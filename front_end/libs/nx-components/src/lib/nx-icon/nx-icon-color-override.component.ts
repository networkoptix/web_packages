import { CommonModule } from '@angular/common';
import {
    Component,
    ChangeDetectionStrategy,
    computed,
    input,
    booleanAttribute,
} from '@angular/core';

import { NxIconOrName } from 'nx-icons';

import { BaseComponent } from '../base-component';
import { CssColorVariables } from '../theme-provider';

import { NxApplyActionParentDirective } from './nx-apply-action-classes-parent.directive';
import { NxApplyActionTargetDirective } from './nx-apply-action-classes-target.directive';
import { NxIconComponent } from './nx-icon.component';

/**
 * Demo component to show how to override the color of an icon.
 *
 * This component won't be used.
 */
@Component({
    selector: 'nx-icon-color-override',
    standalone: true,
    imports: [CommonModule, NxIconComponent, NxApplyActionParentDirective],
    template: `<nx-icon [icon]="icon()" />`,
    styles: `
        :host {
            color: var(--current-color-testing);
        }
        :host.nxHovered {
            /* Hover example */
            color: var(--font-color-error);
        }

        :host.nxActive {
            /* Hover example */
            color: var(--font-color-brand);
        }

        :host.nxFocused {
            /* Hover example */
            color: var(--font-color-disabled);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.current-color-testing]': 'currentColorStoryBookTesting() && useCurrentColor()',
    },
    hostDirectives: [
        {
            directive: NxApplyActionTargetDirective,
            inputs: ['nxActionClassesTarget'],
        },
    ],
})
export class NxIconColorOverrideComponent extends BaseComponent {
    public icon = input.required<NxIconOrName>();

    public currentColorTesting = input(null, {
        transform: (
            value: CssColorVariables,
        ): { '--current-color-testing': CssColorVariables } => ({
            '--current-color-testing': value || 'initial',
        }),
    });

    public useCurrentColor = input(false, {
        transform: (value: 'stroke' | 'fill' | 'both' | boolean) => {
            if (!booleanAttribute(value)) {
                return false;
            }

            if (value === true) {
                return 'both';
            }
            return value;
        },
    });

    public currentColorStoryBookTesting = input(false, { transform: booleanAttribute });

    public primaryStroke = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--svg-primary-stroke-override': value } : null,
    });
    public primaryFill = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--svg-primary-fill-override': value } : null,
    });
    public secondaryStroke = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--svg-secondary-stroke-override': value } : null,
    });
    public secondaryFill = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--svg-secondary-fill-override': value } : null,
    });
    public tertiaryStroke = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--svg-third-stroke-override': value } : null,
    });
    public tertiaryFill = input(null, {
        transform: (value: CssColorVariables) =>
            value ? { '--third-fill-override': value } : null,
    });

    private currentColorStrokeAndFill = computed(
        (): {
            '--svg-primary-fill-override': 'initial' | 'currentColor';
            '--svg-primary-stroke-override': 'initial' | 'currentColor';
        } => {
            const useCurrentColor = this.useCurrentColor();
            const fillOverride = {
                '--svg-primary-fill-override': 'currentColor',
            } as const;
            const strokeOverride = {
                '--svg-primary-stroke-override': 'currentColor',
            } as const;
            const reset = {
                '--svg-primary-stroke-override': 'initial',
                '--svg-primary-fill-override': 'initial',
            } as const;

            if (!useCurrentColor) {
                return reset;
            }

            if (useCurrentColor === 'fill') {
                return {
                    ...reset,
                    ...fillOverride,
                };
            }

            if (useCurrentColor === 'stroke') {
                return {
                    ...reset,
                    ...strokeOverride,
                };
            }

            console.info('Using currentColor for both stroke and fill', {
                ...fillOverride,
                ...strokeOverride,
            });

            return { ...fillOverride, ...strokeOverride } as const;
        },
    );

    override variablesDeclaration = computed(() => {
        return {
            ...this.currentColorStrokeAndFill(),
            ...this.primaryStroke(),
            ...this.primaryFill(),
            ...this.secondaryStroke(),
            ...this.secondaryFill(),
            ...this.tertiaryStroke(),
            ...this.tertiaryFill(),
            ...this.currentColorTesting(),
        };
    });
}
