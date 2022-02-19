import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IGroup } from '../../../store/groups/groups.selectors';

@Component({
    selector: 'ngrx-demo-group-list',
    templateUrl: './group-list.component.html',
})
export class NgrxDemoGroupListComponent {
  @Input() groups: ReadonlyArray<IGroup> = [];
  @Output() nameChangeRequested = new EventEmitter<{ groupId: string, newName: string }>();
  @Output() parentIdChangeRequested = new EventEmitter<{ groupId: string, newParentId: string }>();

  public requestNameChange(groupId: string, event) {
      this.nameChangeRequested.emit({ groupId, newName: event.target.value });
  }

  public requestParentIdChange(groupId: string, event) {
      this.parentIdChangeRequested.emit({ groupId, newParentId: event.target.value });
  }
}
