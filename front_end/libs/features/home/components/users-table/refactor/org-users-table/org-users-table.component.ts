import { Component } from '@angular/core';

import { InitialUserTable } from '../strangler-table/initial-user-table';
import { StranglerImports } from '../strangler-table/strangler-imports';

@Component({
    selector: 'nx-org-users-table',
    templateUrl: '../strangler-table/strangler-table.component.html',
    styleUrls: ['../strangler-table/strangler-table.component.scss'],
    standalone: true,
    imports: [StranglerImports],
})
export class NxOrgUsersTableComponent extends InitialUserTable {}
