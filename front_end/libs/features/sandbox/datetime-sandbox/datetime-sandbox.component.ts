import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { map, timer } from 'rxjs';

import { NxDateTimeFormatService } from '@services/datetime-format.service';

@Component({
    selector: 'nx-datetime-sandbox',
    templateUrl: 'datetime-sandbox.component.html',
    styleUrls: ['datetime-sandbox.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxDatetimeSandboxComponent {
    dateTimeService = inject(NxDateTimeFormatService);
    now$ = timer(0, 1000).pipe(map(_ => Date.now()));

    shortDate$ = this.now$.pipe(map(n => this.dateTimeService.toShortDateString(n)));
    mediumDate$ = this.now$.pipe(map(n => this.dateTimeService.toMediumDateString(n)));
    longDate$ = this.now$.pipe(map(n => this.dateTimeService.toLongDateString(n)));
    fullDate$ = this.now$.pipe(map(n => this.dateTimeService.toFullDateString(n)));

    shortTime$ = this.now$.pipe(map(n => this.dateTimeService.toShortTimeString(n)));
    mediumTime$ = this.now$.pipe(map(n => this.dateTimeService.toMediumTimeString(n)));
    longTime$ = this.now$.pipe(map(n => this.dateTimeService.toLongTimeString(n)));
    fullTime$ = this.now$.pipe(map(n => this.dateTimeService.toFullTimeString(n)));
}
