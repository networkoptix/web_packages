import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

@Component({
    selector: 'nx-group-path',
    template: `
        <span class="group-path">{{ groupPath()[0] }}</span>
        {{ groupPath()[1] }}
    `,
    styleUrls: ['./group-path.component.scss'],
    imports: [CommonModule],
    standalone: true,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxGroupPathComponent {
    // groupPath is the output of getFormattedGroupPath() in NxGroupPathService
    // It should have the format [groupPathString, systemName]
    groupPath = input.required<string[]>();
}
