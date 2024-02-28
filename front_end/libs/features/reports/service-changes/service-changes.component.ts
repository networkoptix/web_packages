import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxServiceChangesTableComponent } from './services-changes-table/service-changes-table.component';

@Component({
    selector: 'nx-service-changes',
    templateUrl: './service-changes.component.html',
    styleUrl: './service-changes.component.scss',
    imports: [TranslateModule, NxServiceChangesTableComponent],
    standalone: true,
})
export class NxServiceChangesComponent {}
