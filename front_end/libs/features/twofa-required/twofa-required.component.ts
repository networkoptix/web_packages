import { Component, Injector, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxPageService } from '@services/page.service';

@UntilDestroy({})
@Component({
    selector: 'nx-src-twofa-required',
    templateUrl: './twofa-required.component.html',
    styleUrls: ['./twofa-required.component.scss']
})
export class TwofaRequiredComponent implements OnInit {
    injector: Injector;
    systemName: string;

    constructor(
        injector: Injector,
        private route: ActivatedRoute,
    ) {
        this.injector = injector;
    }

    ngOnInit(): void {
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            if (params.systemName === undefined) {
                this.injector.get(NxPageService).redirect404();
            }
            this.systemName = params.systemName;
        });
    }
}
