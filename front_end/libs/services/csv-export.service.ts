import { Injectable } from '@angular/core';
import FileSaver from 'file-saver';

import { CVS_OPTIONS } from './csv-export.service.types';

const CSV_EXTENSION = '.csv';
const CSV_TYPE = 'text/plain;charset=utf-8';

@Injectable({
    providedIn: 'root',
})
export class NxCsvExtractService {
    /**
     * Saves the file on the client's machine via FileSaver library.
     *
     * @param buffer The data that need to be saved.
     * @param fileName File name to save as.
     * @param fileType File type to save as.
     */
    private static saveAsFile(buffer: BlobPart, fileName: string, fileType: string): void {
        const data: Blob = new Blob([buffer], { type: fileType });
        FileSaver.saveAs(data, fileName);
    }

    /**
     * Creates an array of data to CSV. It will automatically generate a title row based on object keys.
     *
     * @param rows array of data to be converted to CSV.
     * @param fileName filename to save as.
     * @param options object properties to convert to CSV.
     */
    public exportToCsv(rows: object[], fileName: string, options?: CVS_OPTIONS): string {
        if (!rows || !rows.length) {
            return;
        }
        const separator = options.fieldSeparator;
        const keys = Object.keys(rows[0]).filter((k: string) => {
            if (options.headers?.length) {
                return options.headers.includes(k);
            } else {
                return true;
            }
        });
        const title = options.showTitle && options.title ? options.title + '\n\n' : '';
        const csvContent =
            title +
            keys.join(separator) +
            '\n' +
            rows
                .map(row => {
                    return keys
                        .map(k => {
                            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                            cell =
                                cell instanceof Date
                                    ? cell.toLocaleString()
                                    : cell.toString().replace(/"/g, '""');
                            if (cell.search(/("|,|\n)/g) >= 0) {
                                cell = `"${cell}"`;
                            }
                            return cell;
                        })
                        .join(separator);
                })
                .join('\n');
        NxCsvExtractService.saveAsFile(csvContent, `${fileName}${CSV_EXTENSION}`, CSV_TYPE);
    }
}
