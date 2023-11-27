import { CommonModule, KeyValuePipe } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonAction, ButtonType } from '@components/button/button.component.types';
import { NxDropdownComponent } from '@components/dropdownV2/dropdown.component';
import { NxSimpleDropdownItemComponent } from '@components/dropdownV2/dropdownItems/simpleDropdownItem/simple-dropdown-item.component';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-time-nav',
    templateUrl: './time-nav.component.html',
    styleUrls: ['./time-nav.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxButtonComponent,
        AngularSvgIconModule,
        NxDropdownComponent,
        NxSimpleDropdownItemComponent,
        TranslateModule,
        KeyValuePipe,
    ],
})
export class WebGlTimelineTimeNavComponent {
    @Output() onChange = new EventEmitter<Record<string, unknown>>();

    protected readonly ButtonType = ButtonType;
    protected readonly ButtonAction = ButtonAction;
    protected readonly icons = icons;

    selectedJumpTarget: number;
    jumpLabels = {
        'Last 7 days': 7,
        'Last 14 days': 14,
        'Last 30 days': 30,
        'All time': 0,
    };

    handleCalendarClick(): void {}

    handleActionClick(e: Record<string, unknown>): void {
        this.onChange.emit({ actin: e.action, param: e.param });
    }
}
