import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

@UntilDestroy({ })
@Component({
    selector: 'src-twofa-required',
    templateUrl: './twofa-required.component.html',
    styleUrls: ['./twofa-required.component.scss']
})
export class TwofaRequiredComponent implements OnInit {
    systemName: string;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
    ) {
        const LANG = languageService.translations;
        pageService.pageTitle = LANG.pageTitles.twofaRequired();
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
