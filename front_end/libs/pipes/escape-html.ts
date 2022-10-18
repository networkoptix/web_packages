import { Pipe, PipeTransform } from '@angular/core';
import { escape } from 'lodash-es';

@Pipe({ name: 'escapeHTML' })
export class EscapeHtmlPipe implements PipeTransform {
    public transform(value: string): string {
        return escape(value);
    }
}
