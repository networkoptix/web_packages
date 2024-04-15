import { CommonModule, KeyValuePipe } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonAction, ButtonType } from '@components/button/button.component.types';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
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
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        TranslateModule,
        KeyValuePipe,
        FormsModule,
    ],
})
export class WebGlTimelineTimeNavComponent {
    @Output() onChange = new EventEmitter<Record<string, unknown>>();

    protected readonly ButtonType = ButtonType;
    protected readonly icons = icons;

    selectedJumpTarget: number;
    jumpLabels = {
        'Last 7 days': 7,
        'Last 14 days': 14,
        'Last 30 days': 30,
        'All time': 0,
    };

    handleCalendarClick(): void {}

    handleJumpTargetChange(jumpTarget: number | undefined): void {
        this.selectedJumpTarget = jumpTarget as number;
        this.handleActionClick({
            action: ButtonAction.actionJumpTo,
            param: this.selectedJumpTarget,
        });
    }

    handleActionClick(e: Record<string, unknown>): void {
        this.onChange.emit({ actin: e.action, param: e.param });
    }
}
