import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { testBedSetupFactory } from 'test_utils/test_bed_setup_factory';

import { HelperMockProvider } from '@mocks/helpers.test';
import { devToolsNode } from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxHeaderService } from '@services/nx-header.service';

import { NxDevToolsComponent } from './dev-tools.component';

const mockRoute = {
    snapshot: {
        paramMap: {
            get: () => 'developers',
        },
    },
};
const cloudApiMock = {
    getDocumentation: () => of(devToolsNode),
};

const providers = [
    new HelperMockProvider(NxCloudApiService, cloudApiMock),
    new HelperMockProvider(NxHeaderService, {}),
    new HelperMockProvider(NxAccountService, {}),
    new HelperMockProvider(ActivatedRoute, mockRoute),
];

const setupDevToolsComponent = (): ReturnType<typeof setupComponent<NxDevToolsComponent>> => {
    nxConfig.docMenuMap.developers = {
        '': 'Platform overview (For developers landing)',
        'dev-tools': 'test - Developer Tools',
        knowledgebase: 'For Developers Knowledge Base',
    };
    return testBedSetupFactory([], providers)(NxDevToolsComponent);
};

describe('NxDevToolsComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupDevToolsComponent();
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', async () => {
        const { component, fixture, debugElement } = await setupDevToolsComponent();
        devToolsNode.url = 'testUrl';
        component.devToolsNode = devToolsNode;
        component.title = devToolsNode.title;
        fixture.detectChanges();
        const heading = debugElement.nativeElement
            .querySelector('.heading-link')
            .textContent.trim();
        expect(heading).toBe(devToolsNode.title);
    });

    it('should show the correct number of tool blocks', async () => {
        const { debugElement } = await setupDevToolsComponent();
        const numToolBlocks = debugElement.nativeElement.querySelectorAll('.tool-card').length;
        expect(numToolBlocks).toBe(devToolsNode.nodes.length);
    });

    it('should show the correct tool block heading', async () => {
        const { component, debugElement } = await setupDevToolsComponent();
        component.devToolsNode = devToolsNode;
        const toolBlockHeading = debugElement.nativeElement
            .querySelector('.tool-detail > h3')
            .textContent.trim();

        expect(toolBlockHeading).toBe(devToolsNode.nodes[0].asset.title);
    });

    it('should show the correct tool block content', async () => {
        const { debugElement } = await setupDevToolsComponent();
        const toolBlockContent = debugElement.nativeElement
            .querySelector('.tool-detail > p')
            .textContent.trim();
        expect(toolBlockContent).toBe(devToolsNode.nodes[0].asset.shortDescription);
    });
});
