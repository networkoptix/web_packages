import { Component, OnDestroy }      from '@angular/core';
import { NxPageService }             from '@services/page.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxSystem, NxSystemService } from '@services/system.service';
import { ActivatedRoute }            from '@angular/router';
import { SubscriptionLike }          from 'rxjs';
import { UntilDestroy }              from '@ngneat/until-destroy';


@UntilDestroy({ checkProperties: true })
@Component({
    selector   : 'nx-api-tool',
    styleUrls  : ['api-tool.component.scss'],
    templateUrl: 'api-tool.component.html'
})
export class NxApiToolComponent implements OnDestroy{
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    apiDoc: JSON;

    routeParamsSubscription: SubscriptionLike;

    constructor(
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
        private route: ActivatedRoute,
        private systemService: NxSystemService
    ) {
        this.LANG = languageService.translations;
        pageService.pageTitle = this.LANG.pageTitles.apiTool();

        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                this.system = this.systemService.createSystem('', params.systemId, '');
                this.system.getServerApiDoc(`{${params.serverId}}`)
                    .then((response) => {
                        this.apiDoc = response;
                    });
            });
    }

    ngOnDestroy() {}
}
