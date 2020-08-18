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
        private cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private route: ActivatedRoute
    ) {
        this.CONFIG = configService.config;
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

export const mockDocker = KnowledgeNode.normalHeader(
    'Docker',
    'developers/knowledge-base/docker',
    '<div><h1>Content Here</h1><p>More content</p></div>',
    [
        KnowledgeNode.normalHeader(
            'Information',
            '',
            '<div><h2 class="mb-3">Information Heading</h2><p>Docker Content</p></div>'
        ),
        KnowledgeNode.sideHeader(
            'Side Heading',
            '',
            '<div><h2 class="mb-3">Side Content Heading</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p></div>',
            [],
            'systems.svg',
            'using'
        ),
        KnowledgeNode.sideHeader(
            'Side Heading',
            '',
            '<div><h2 class="mb-3">Side Content Heading</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p></div>',
            [],
            '',
            'using'
        ),
        KnowledgeNode.sideHeader(
            'Side Heading 2',
            '',
            '<div><h2 class="mb-3">Side Content Heading</h2><p>Side content body</p></div>',
            [],
            'systems.svg',
            'using'
        )
    ]
);

export const mockArticle = KnowledgeNode.article(
    'Mock Article',
    '',
    '<div><h2 class="mb-3">Side Content Heading</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p><img style="width: 75%; margin: 0 auto; display: block" class="mt-3 mb-3" src="https://www.networkoptix.com/wp-content/uploads/2018/10/World-MAP.png"></img><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p></div>'
);
