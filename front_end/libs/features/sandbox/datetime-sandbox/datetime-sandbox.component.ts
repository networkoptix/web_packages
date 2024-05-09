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

    shortDate$ = this.now$.pipe(map(n => this.dateTimeService.shortDateString(n)));
    mediumDate$ = this.now$.pipe(map(n => this.dateTimeService.mediumDateString(n)));
    longDate$ = this.now$.pipe(map(n => this.dateTimeService.longDateString(n)));
    fullDate$ = this.now$.pipe(map(n => this.dateTimeService.fullDateString(n)));

    shortTime$ = this.now$.pipe(map(n => this.dateTimeService.shortTimeString(n)));
    mediumTime$ = this.now$.pipe(map(n => this.dateTimeService.mediumTimeString(n)));
    longTime$ = this.now$.pipe(map(n => this.dateTimeService.longTimeString(n)));
    fullTime$ = this.now$.pipe(map(n => this.dateTimeService.fullTimeString(n)));

    shortDateTime$ = this.now$.pipe(map(n => this.dateTimeService.shortDateShortTimeString(n)));
    medDateShortTime$ = this.now$.pipe(map(n => this.dateTimeService.mediumDateShortTimeString(n)));
}
