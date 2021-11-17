import { Pipe, PipeTransform } from '@angular/core';

import { NxUtilsService } from '@services/utils.service';

@Pipe({ name: 'unsafe' })
export class NxUnsafePipe implements PipeTransform {
    public transform(value: string): string {
        return NxUtilsService.htmlToEntity(value);
    }
}
