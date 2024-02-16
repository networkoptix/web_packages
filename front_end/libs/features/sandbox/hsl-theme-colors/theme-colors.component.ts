import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';

@Component({
    selector: 'nx-hsl-theme-colors',
    templateUrl: 'theme-colors.component.html',
    styleUrls: ['theme-colors.component.scss'],
    standalone: true,
    imports: [CommonModule, NxThemeGeneratorComponent],
})
export class NxHSLThemeColorsComponent {}
