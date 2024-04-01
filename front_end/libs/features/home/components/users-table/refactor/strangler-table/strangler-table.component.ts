import { Component } from '@angular/core';

import { InitialUserTable } from './initial-user-table';
import { StranglerImports } from './strangler-imports';

/**
 * This component doesn't do anything other than ensure that to type check strangler-table.component.html
 * against the BaseUsersTable class.
 */
@Component({
    selector: 'nx-strangler-users-table',
    templateUrl: 'strangler-table.component.html',
    styleUrls: ['strangler-table.component.scss'],
    standalone: true,
    imports: [StranglerImports],
})
export class NxStranglerUsersTableComponent extends InitialUserTable {}
