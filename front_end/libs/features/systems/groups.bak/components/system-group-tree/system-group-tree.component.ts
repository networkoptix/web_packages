import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ListItem } from '../../store/groups/groups.types';
import { ParentIdChangeRequestedEvent } from '../events';

@Component({
    selector: 'nx-system-group-tree',
    templateUrl: './system-group-tree.component.html',
    styleUrls: ['./system-group-tree.component.scss']
})
export class NxSystemGroupTreeComponent {
    @Input() forest: ReadonlyArray<ListItem> = [];
    @Input() activeItemId: string = null;
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

    public reemitParentIdChangeRequested(e: ParentIdChangeRequestedEvent): void {
        this.parentIdChangeRequested.emit(e);
    }
}
