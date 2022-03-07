import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IGroup } from '../../store/groups/groups.selectors';

@Component({
    selector: 'nx-system-group-tree',
    templateUrl: './system-group-tree.component.html',
    styleUrls: ['./system-group-tree.component.scss']
})
export class NxSystemGroupTreeComponent {
    @Input() groups: ReadonlyArray<IGroup> = [];
    @Output() nameChangeRequested = new EventEmitter<{ groupId: string, newName: string }>();
    @Output() parentIdChangeRequested = new EventEmitter<{ groupId: string, newParentId: string }>();

    public requestNameChange(groupId: string, event: Event): void {
        this.nameChangeRequested.emit({
            groupId,
            newName: (event.target as HTMLInputElement).value
        });
    }

    public requestParentIdChange(groupId: string, event: Event): void {
        this.parentIdChangeRequested.emit({
            groupId,
            newParentId: (event.target as HTMLInputElement).value
        });
    }
}
