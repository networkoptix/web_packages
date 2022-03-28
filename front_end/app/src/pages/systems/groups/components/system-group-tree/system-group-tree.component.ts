import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IGroup } from '../../store/groups/groups.selectors';

interface ParentIdChangeRequestedEvent {
    groupId: string,
    newParentId: string
}

@Component({
    selector: 'nx-system-group-tree',
    templateUrl: './system-group-tree.component.html',
    styleUrls: ['./system-group-tree.component.scss']
})
export class NxSystemGroupTreeComponent {
    @Input() systemNames: Record<string, string> = {};
    @Input() groups: ReadonlyArray<IGroup> = [];
    @Output() parentIdChangeRequested = new EventEmitter<ParentIdChangeRequestedEvent>();

    public onDragStart(e: DragEvent, groupId: string): void {
        e.dataTransfer.setData('system-group-id', groupId);
    }

    public onDragOver(e: DragEvent): void {
        e.preventDefault();
    }

    public onDrop(e: DragEvent, newParentId: string): void {
        e.preventDefault();
        this.parentIdChangeRequested.emit({
            groupId: e.dataTransfer.getData('system-group-id'),
            newParentId
        });
    }

    public reemitParentIdChangeRequested(e: ParentIdChangeRequestedEvent): void {
        this.parentIdChangeRequested.emit(e);
    }
}
