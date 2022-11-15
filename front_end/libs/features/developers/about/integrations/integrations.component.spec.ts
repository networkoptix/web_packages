import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockDirective, MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { PipesModule } from '@app/pipes/pipes.module';
import {
    getMockTranslations,
    HelperMockProvider,
    sanitizerMock
} from '@mocks/helpers.test';
import {
    integrationsNode
} from '@mocks/knowledge_base_landing.mock';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { NxIntegrationsComponent } from './integrations.component';

describe('NxIntegrationsComponent', () => {
    let component: NxIntegrationsComponent;
    let fixture: ComponentFixture<NxIntegrationsComponent>;
    let el: DebugElement;
    let infoBlock;
    let pluginsBlock;
    const pluginsToShow = 3;

    const [infoNode, pluginsNode] = integrationsNode.nodes;
    const firstPluginNode = pluginsNode.nodes[0];
    const integrations = { count: 32 };

    const configMock = { config: nxConfig };

    const langMock = getMockTranslations({
        common: {
            morePlugins: ({ count, startTag, endTag }) => `${startTag}${count}${endTag} more integrations...`
        }
    });

    const cloudApiMock = {
        getIntegrationsCount: () => new BehaviorSubject(integrations)
    };

    const getInfoBlock = el => {
        const block = el.nativeElement.querySelector('.info-block');
        const title = block.querySelector('h3').innerText;
        const content = block.querySelector('p').innerText;
        const button = block.querySelector('button').innerText;
        return { title, content, button };
    };

    const getPluginsBlock = el => {
        const block = el.nativeElement.querySelector('.integrations-block');
        const title = block.querySelector('h3').innerText;
        const button = block.querySelector('button').innerText;
        const shownPlugins = block.querySelectorAll('.integration-block:not(.more-span)').length;
        const additionalPlugins = block.querySelector('.more-span > p > strong').innerText;
        const firstPluginBlock = block.querySelector('.integration-block');
        const firstPlugin = {
            altText: firstPluginBlock.querySelector('img').alt,
            iconSrc: firstPluginBlock.querySelector('img').src
        };
        return { title, button, additionalPlugins, shownPlugins, firstPlugin };
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxIntegrationsComponent,
                    MockDirective(RouterLink),
                ],
                imports: [
                    PipesModule,
                    CommonModule,
                    TranslateModule.forRoot()
                ],
                providers: [
                    new HelperMockProvider(NxConfigService, configMock),
                    new HelperMockProvider(NxLanguageProviderService, langMock),
                    MockProvider(WINDOW),
                    new HelperMockProvider(NxCloudApiService, cloudApiMock),
                    new HelperMockProvider(DomSanitizer, sanitizerMock)
                ]
            });

            fixture = TestBed.createComponent(NxIntegrationsComponent);
            component = fixture.componentInstance;
            component.integrationsNode = integrationsNode;
            el = fixture.debugElement;
            fixture.detectChanges();
            infoBlock = getInfoBlock(el);
            pluginsBlock = getPluginsBlock(el);
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the correct title', () => {
        const title = el.nativeElement.querySelector('h2').innerText;
        expect(title).toBe(integrationsNode.title);
    });

    it('should show the correct info block heading', () => {
        expect(infoBlock.title).toBe(infoNode.title);
    });

    it('should show the correct info block button', () => {
        expect(infoBlock.button).toBe(infoNode.subtitle);
    });

    it('should show the correct info block content', () => {
        expect(infoBlock.content).toBe(infoNode.asset.shortDescription);
    });

    it('should show the correct plugins heading', () => {
        expect(pluginsBlock.title).toBe(pluginsNode.title);
    });

    it('should show the correct plugins block button', () => {
        expect(pluginsBlock.button).toBe(pluginsNode.subtitle);
    });

    it('should show the correct number of plugins', () => {
        expect(pluginsBlock.shownPlugins).toBe(pluginsToShow);
    });

    it('should show the correct number of additional plugins', () => {
        expect(pluginsBlock.additionalPlugins).toBe((integrations.count - pluginsToShow).toString());
    });

    it('should show the correct plugin alt text', () => {
        expect(pluginsBlock.firstPlugin.altText).toBe(firstPluginNode.title);
    });

    it('should show the correct plugin icon', () => {
        expect(pluginsBlock.firstPlugin.iconSrc).toBe(firstPluginNode.asset.information.logo);
    });
});
