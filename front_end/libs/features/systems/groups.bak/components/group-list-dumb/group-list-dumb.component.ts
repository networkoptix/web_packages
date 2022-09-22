import { Component, Input, Output, EventEmitter } from '@angular/core';

import type { GroupListItem } from '../../store/groups/groups.types';
import { ParentIdChangeRequestedEvent } from '../events';

@Component({
    selector: 'nx-group-list-dumb-component',
    templateUrl: 'group-list-dumb.component.html',
    styleUrls: ['group-list-dumb.component.scss', '@components/systems-list/list.component.scss']
})
export class NxGroupListDumbComponent {
    @Input() groups: Array<GroupListItem> = [];
    @Input() searchString: string = '';
    @Output() parentIdChangeRequested = new EventEmitter<ParentIdChangeRequestedEvent>();

    public onDragStart(e: DragEvent, id: string, type: string): void {
        e.dataTransfer.setData('id', id);
        e.dataTransfer.setData('type', type);
    }

    public onDragOver(e: DragEvent): void {
        e.preventDefault();
    }

    public onDrop(e: DragEvent, newParentId: string): void {
        e.preventDefault();
        this.parentIdChangeRequested.emit({
            id: e.dataTransfer.getData('id'),
            type: e.dataTransfer.getData('type'),
            newParentId
        });
    }
}
