import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy({ })
@Component({
    selector: 'nx-src-twofa-required',
    templateUrl: './twofa-required.component.html',
    styleUrls: ['./twofa-required.component.scss']
})
export class TwofaRequiredComponent implements OnInit {
    systemName: string;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
    ) {
    }

    ngOnInit(): void {
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            if (params.systemName === undefined) {
                this.router.navigate(['404']);
            }
            this.systemName = params.systemName;
        });
    }
}
