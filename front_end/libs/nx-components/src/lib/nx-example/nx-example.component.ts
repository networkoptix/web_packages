import { CommonModule } from '@angular/common';
import {
    booleanAttribute,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { dispatch } from '../../common';
import { BaseComponent } from '../base-component';
import { Percentage } from '../theme-provider';
import { generateCssVariableName } from '../theme-provider/color-generator';
import { createThemePatchEvent } from '../theme-provider/events';

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
     * A signal model example
     */

    testModel = model('testModel');

    useHct = input<boolean, unknown>(false, { transform: booleanAttribute });

    coreSaturation = input<Percentage>(20);

    initialHct = this.themeProvider.currentTheme().options.useHct;
    initialCoreSaturation = this.themeProvider.currentTheme().options.coreSaturation;

    syncOptionOverridesEffect = effect(
        () => {
            if (window.location.href.endsWith('--docs')) {
                return;
            }
            const useHct = this.useHct();
            const coreSaturation = this.coreSaturation();
            dispatch(createThemePatchEvent({ options: { useHct, coreSaturation } }));
            return () =>
                dispatch(
                    createThemePatchEvent({
                        options: {
                            useHct: this.initialHct,
                            coreSaturation: this.initialCoreSaturation,
                        },
                    }),
                );
        },
        { allowSignalWrites: true },
    );

    override themeOptionOverride = computed(() => ({
        useHct: this.useHct(),
        coreSaturation: this.coreSaturation(),
    }));

    override variablesDeclaration = computed(
        () =>
            ({
                '--example-background-color': generateCssVariableName('core', 'dark3'),
            }) as const,
    );
}
