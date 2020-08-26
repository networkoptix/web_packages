import { Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxCloudApiService } from '../../../services/nx-cloud-api';
import { ActivatedRoute } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { NxHeaderService } from '../../../services/nx-header.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-knowledge-base',
    templateUrl : 'knowledge-base.component.html',
    styleUrls   : ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent implements OnInit {
    CONFIG: IConfig;

    loading = true;
    node: KnowledgeNode;

    constructor(
        configService: NxConfigService,
        public cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute
    ) {
        this.CONFIG = configService.config;
    }

    prefetchDocument(assetId) {
        console.info(`%cPrefetching document ${assetId}`, 'color:blue;font-size:1.5rem;padding: .75rem 4rem; background-color:gray');
        this.cloudApi.getDocumentation(assetId).subscribe(document => {
            console.info(
                `%cSuccessfully prefetched document: \n%c${document.title}`,
                'color:green;font-size:1.25rem',
                'color:white;font-size:.75rem;padding:0.5rem 0'
            );
        });
    }

    ngOnInit() {
        this.route.url.pipe(
            switchMap(urlSegment => {
                this.loading = true;
                const assetId = urlSegment[0]?.path || this.headerService.currentLocation.assetId;
                return this.cloudApi.getDocumentation(assetId)
                    .pipe(
                        tap(({ title, blocks, contentHTML }) => {
                            this.node = KnowledgeNode.normalHeader(
                                title,
                                assetId,
                                contentHTML,
                                blocks.map(({ contentHTML, title }) => KnowledgeNode.normalHeader(
                                    title,
                                    '',
                                    contentHTML
                                ))
                            );
                            this.loading = false;
                        })
                    );
            })
        ).subscribe();
    };
};

export enum CardClasses {
    NORMAL='normal',
    SIDE='side',
    ARTICLE='article'
}

export class KnowledgeNode {
    private constructor(
        public title: string,
        public url: string,
        public content: string,
        public nodes: KnowledgeNode[],
        public cardClass: CardClasses,
        public cardIcon?: string,
        public cardLead?: string
    ) {}

    // Factory methods
    static normalHeader(
        title: string,
        url: string,
        content: string,
        nodes: KnowledgeNode[] = []
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
            CardClasses.NORMAL
        );
    }

    static sideHeader(
        title: string,
        url: string,
        content,
        nodes: KnowledgeNode[],
        cardIcon: string,
        cardLead: string
    ) {
        return new KnowledgeNode(
            title,
            url,
            content,
            nodes,
            CardClasses.SIDE,
            cardIcon,
            cardLead
        );
    }

    static article(
        title: string,
        url: string,
        content: string,
        showHeader = true,
        nodes = []
    ) {
        return new KnowledgeNode(
            showHeader ? title : '',
            url,
            content,
            nodes,
            CardClasses.ARTICLE,
            '',
            ''
        );
    }
}
