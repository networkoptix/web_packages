import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { HelperMockProvider } from '@mocks/helpers.test';
import {
    landingRoute,
    // docMenuMap,
    menuStructure,
    documentation,
    introNode,
    routeLandingMock,
} from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';

import { NxAboutComponent } from './about.component';

const account = { is_superuser: false };
const accountMock = {
    get: () => Promise.resolve(account),
    // currentUser$: of(account)
    // TODO: Replace with mock store
};
const ribbonMock: any = {
    hide() {
        this.isShown = false;
    },
    context: {},
    isShown: true,
};
const aboutParentStructure = {
    ...menuStructure,
    nodes: [introNode],
};
const mockMenu = {
    getMenu: () => new BehaviorSubject(aboutParentStructure),
    currentSystemNode$: new BehaviorSubject(null),
};

const cloudApiMock = {
    getDocumentation: () => new BehaviorSubject(documentation),
};

const providers = [
    new HelperMockProvider(NxCloudApiService, cloudApiMock),
    new HelperMockProvider(ActivatedRoute, landingRoute),
    new HelperMockProvider(Router, routeLandingMock),
    new HelperMockProvider(NxRibbonService, ribbonMock),
    new HelperMockProvider(NxMenusService, mockMenu),
    new HelperMockProvider(NxAccountService, accountMock),
];

const setupAboutComponent = () => setupComponent(NxAboutComponent, {}, [], providers);

describe('NxAboutComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupAboutComponent();
        expect(component).toBeTruthy();
    });

    /**
     * Need to update test case. Page metadata implementation has changed and the spec has also changed.
     */
    xit('should set the correct page title and description', async () => {
        const { component } = await setupAboutComponent();
        const { pageTitle, pageDescription } = component.pageService;
        const { title, description } = aboutParentStructure;
        expect(pageTitle).toEqual(title);
        expect(pageDescription).toEqual(description);
    });

    it('should hide ribbon for non superuser', async () => {
        const { component } = await setupAboutComponent();
        expect(component.ribbonService.context.visibility).toBeFalsy();
    });
});
