import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ShowMoreFilters as DT } from '../dialogs.types';

@Component({
    selector: 'nx-show-more-filters',
    templateUrl: 'show-more.component.html',
    styleUrls: ['show-more.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule],
})
export class NxShowMoreFiltersComponent {
    dialogData: DT['data'] = inject(DIALOG_DATA);
    dialogRef = inject(DialogRef<DT['return']>);

    close(): void {
        this.dialogRef.close();
    }
}
