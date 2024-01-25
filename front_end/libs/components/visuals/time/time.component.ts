import { AsyncPipe } from '@angular/common';
import { Input, Component } from '@angular/core';
import dateFormat from 'dateformat';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';

import { FULL_TIME_FORMAT } from '@components/nx-webgl-canvas/webgl-canvas.types';

@Component({
    selector: 'nx-time',
    template: ` <div>{{ time$ | async }}</div>`,
    styleUrls: ['./time.component.scss'],
    standalone: true,
    imports: [AsyncPipe],
})
export class NxTimeComponent {
    @Input() format: string = FULL_TIME_FORMAT;

    time$ = timer(0, 1000).pipe(map(() => dateFormat(Date.now(), this.format)));
}
