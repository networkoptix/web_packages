import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'NxHealthDate' })
export class NxHealthDatePipe implements PipeTransform {
    transform(date: string | number, format?: string): string {
        if (date === 'now') {
            return date;
        }

        if (!format) {
            format = 'MM/dd/yyyy, HH:mm';
        }
        return formatDate(new Date(date), format, navigator.language);
    }
}
