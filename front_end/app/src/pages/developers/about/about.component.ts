import { Component, Input } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { BehaviorSubject }  from 'rxjs';

import { NxCloudApiService }    from '../../../services/nx-cloud-api';
import { NxHeaderService }      from '../../../services/nx-header.service';

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

    aboutStructure$ = new BehaviorSubject<AboutStructure>(null);
    aboutCases = AboutTemplates;

    get aboutStructure() {
        return this.aboutStructure$.value;
    }

    set aboutStructure(value) {
        this.aboutStructure$.next(value);
    }

    constructor(private cloudApi: NxCloudApiService, public headerService: NxHeaderService) {
        this.cloudApi.getDocumentation('about_page').subscribe(about => {
            const mapToAboutNode = ({
                name,
                display_name: displayName,
                asset_id: assetId,
                new_window: newWindow,
                asset,
                url,
                icon,
                nodes
            }): AboutNode => {
                return ({
                    title       : displayName || name || asset.title,
                    displayName : displayName || name,
                    nodes       : nodes && nodes.map(mapToAboutNode),
                    url         : url || `/developers/knowledge-base/${assetId}`,
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
    tags: string[];
    shortDescription: string;
    blocks: AboutAssetBlock;
}

export interface AboutAssetBlock {
    title: string;
    titleHTML: string;
    content: string;
    contentHTML: string;
}
