import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { BehaviorSubject }  from 'rxjs';

import { NxCloudApiService, DOC_TYPES }    from '../../../services/nx-cloud-api';
import { NxHeaderService }      from '../../../services/nx-header.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IConfig, NxConfigService } from '../../../services/nx-config';

export enum AboutTemplates {
    INTRO='intro',
    CAPABILITIES='capabilities',
    SUPPORTED_TECH='supportedTech',
    GET_STARTED='getStarted',
    DEV_TOOLS='devTools',
    INTEGRATIONS='integrations',
    SUPPORT='support'
}

@UntilDestroy({ checkProperties: true, blackList: ['aboutStructure$'] })
@Component({
    selector    : 'nx-about',
    templateUrl : 'about.component.html',
    styleUrls   : ['about.component.scss']
})
export class NxAboutComponent {
    @Input() heading: string = 'Develop with %CLOUD_NAME%';
    @Input() lead: string = '%CLOUD_NAME% is an extensible IP Video Development Platform created for software developers who want to create new Powered-by-%VMS_NAME% products and scalable integrations.'

    CONFIG: IConfig;
    aboutStructure$ = new BehaviorSubject<AboutStructure>(null);
    aboutCases = AboutTemplates;
    baseName = '';
    menuName = '';

    get aboutStructure() {
        return this.aboutStructure$.value;
    }

    set aboutStructure(value) {
        this.aboutStructure$.next(value);
    }

    get path() {
        return this.router.url.split('?')[0];
    }

    constructor(
        private cloudApi: NxCloudApiService,
        public headerService: NxHeaderService,
        private route: ActivatedRoute,
        public router: Router,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.config;
        this.baseName = this.route.snapshot.paramMap.get('name');
        this.menuName = this.CONFIG.docMenuMap[this.baseName]?.[''];
        if (!this.menuName) {
            setTimeout(() => this.router.navigate([this.CONFIG.redirect.page404]));
            return;
        }
        const { state } = this.route.snapshot.queryParams;
        this.cloudApi.getDocumentation(this.menuName, DOC_TYPES.struct, '', state).subscribe(about => {
            const mapToAboutNode = ({
                name,
                display_name: displayName,
                asset_id: assetId,
                new_window: newWindow,
                asset,
                assetKB,
                url,
                icon,
                nodes
            }): AboutNode => {
                return ({
                    title       : displayName || name || asset.title,
                    displayName : displayName || name,
                    nodes       : nodes && nodes.map(mapToAboutNode),
                    url         : url || (assetKB ? `/docs/${this.baseName}/${assetKB}/${assetId}` : ''),
                    assetId,
                    asset,
                    icon,
                    newWindow
                });
            };
            const mapToAboutStructure = (node):AboutStructureNode => ({
                template : node.icon.split(' ')[0],
                node     : mapToAboutNode(node)
            });

            this.aboutStructure = about.map(mapToAboutStructure);
        });
    }
};

export type AboutStructureNode = {template: AboutTemplates, node: AboutNode}

export type AboutStructure = AboutStructureNode[]

export interface AboutNode {
    title: string;
    displayName: string;
    assetId: number;
    asset: any;
    url: string;
    icon: string;
    newWindow?: boolean;
    nodes?: AboutNode[];
}

export interface AboutAsset {
    title: string;
    shortDescription: string;
    blocks: AboutAssetBlock;
}

export interface AboutAssetBlock {
    title: string;
    titleHTML: string;
    content: string;
    contentHTML: string;
}
