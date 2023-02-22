import { Component, Input } from '@angular/core';

import { NxCsvExtractService } from '@services/csv-export.service';
import { CVS_OPTIONS } from '@services/csv-export.service.types';

// Component to customize the "export to csv" button
@Component({
    selector: 'nx-csv-button',
    templateUrl: './csv-button.component.html',
    styleUrls: ['./csv-button.component.scss'],
})
export class CsvButtonComponent {
    @Input() data: object[];
    @Input() filename: string;
    @Input() options: CVS_OPTIONS;

    constructor(
        private extractService: NxCsvExtractService
    ) {}

    downloadCSV(): void {
        this.extractService.exportToCsv(this.data, this.filename, this.options);
    }
}
