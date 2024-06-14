import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

@Component({
    selector: 'nx-theme-variable-generator-sandbox',
    templateUrl: 'theme-variable-generator-sandbox.component.html',
    styleUrls: ['theme-variable-generator-sandbox.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxThemeVariableGeneratorSandboxComponent {
    themes = ['dark', 'dark-gray', 'light-gray', 'light'];
    examples = [
        'matching',
        'inverted',
        'split-matching',
        'split-inverted',
        'split-dark',
        'split-light',
        'all-different',
    ];
    colors = [
        ['dark9', 'dark_gray_9', 'light_gray_9', 'light9'],
        ['light11', 'light_gray_11', 'dark_gray_11', 'dark11'],
        ['dark12', 'dark_gray_12', 'light_gray_8', 'light8'],
        ['light8', 'light_gray_8', 'dark_gray_12', 'dark12'],
        ['dark10', 'dark10', 'dark7', 'dark7'],
        ['light7', 'light7', 'light10', 'light10'],
        ['dark6', 'dark_gray_8', 'light14', 'light15'],
    ];
}
