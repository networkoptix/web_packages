import { Component } from '@angular/core';

import { AbstractUserTableDirective } from '../shared/abstract-user-table.directive';
import { StranglerImports } from '../strangler-table/strangler-imports';

@Component({
    selector: 'nx-users-access-table',
    templateUrl: '../strangler-table/strangler-table.component.html',
    styleUrls: ['../strangler-table/strangler-table.component.scss'],
    standalone: true,
    imports: [StranglerImports],
})
export class NxUsersAccessTableComponent extends AbstractUserTableDirective {}
