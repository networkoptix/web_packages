import { Pipe, PipeTransform } from '@angular/core';

import { htmlToEntity } from '@utils/general';

@Pipe({ name: 'unsafe' })
export class NxUnsafePipe implements PipeTransform {
    public transform(value: string): string {
        return htmlToEntity(value);
    }
}
