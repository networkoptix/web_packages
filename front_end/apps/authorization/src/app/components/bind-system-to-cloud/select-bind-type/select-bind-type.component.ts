import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { BindType, Org } from '../../../types/cloud-bind.types';

@Component({
    selector: 'nx-select-bind-type',
    templateUrl: './select-bind-type.component.html',
    styleUrls: ['./select-bind-type.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class SelectBindTypeComponent {
    protected readonly icons = icons;
    protected readonly bindType = BindType;
    orgs$$ = signal<Org[]>([]);
    orgCount$$ = computed(() => this.orgs$$().length);
    protected selectedBindType: BindType | undefined;

    @Input() set orgs(orgs: Org[]) {
        this.orgs$$.set(orgs);
    }

    @Output() bindSelection = new EventEmitter<BindType>();

    setBind(bindType: BindType): void {
        this.selectedBindType = bindType;
        this.bindSelection.emit(bindType);
    }
}
