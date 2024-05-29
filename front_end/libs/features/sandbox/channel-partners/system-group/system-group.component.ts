import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { LetDirective, PushPipe } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, map, merge, mergeMap, of } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import { GroupUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-system-group',
    templateUrl: 'system-group.component.html',
    styleUrls: ['system-group.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, LetDirective, PushPipe],
})
export class NxSystemGroupComponent {
    private id$ = this.route.params.pipe(map<Params, string>(p => p.groupId));
    private refresh$ = new Subject<void>();
    private update$ = merge(this.id$, this.refresh$.pipe(mergeMap(() => this.id$)));

    error: { code: number; msg: string };
    usersError: { code: number; msg: string };

    group$ = this.update$.pipe(
        mergeMap(this.cpService.getGroup),
        catchError((err: HttpErrorResponse) => {
            this.error = { code: err.status, msg: err.error.detail };
            return of(null);
        }),
    );
    users$ = this.update$.pipe(
        mergeMap(this.cpService.getGroupUsers),
        catchError((err: HttpErrorResponse) => {
            this.usersError = { code: err.status, msg: err.error.detail };
            return of<GroupUser[]>([]);
        }),
    );

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cpService: NxChannelPartnersService,
    ) {}

    back(): void {
        this.router.navigate(['sandbox', 'channel-partners']);
    }

    up(parent: string | null): void {
        this.router.navigate(['../' + (parent ?? '')], { relativeTo: this.route });
    }
}
