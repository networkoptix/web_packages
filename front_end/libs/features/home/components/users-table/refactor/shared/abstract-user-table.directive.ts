import { Directive } from '@angular/core';

import { InitialUserTable } from '../strangler-table/initial-user-table';

/**
 * This is the abstract class that all user tables should extend. It provides common functionality
 * used across all user tables. Any behavior that isn't shared or needs to be configured by the
 * concrete implementation should only be declared here as an abstract method or property with
 * the concrete implementation in the concrete class.
 */
@Directive()
export abstract class AbstractUserTableDirective extends InitialUserTable {
    // ...
}
