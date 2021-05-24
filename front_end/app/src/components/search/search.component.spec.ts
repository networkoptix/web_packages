import { waitForAsync, ComponentFixture, TestBed, tick, fakeAsync } from '@angular/core/testing';
import { CommonModule, Location } from '@angular/common';

import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { getMockTranslations, MockProvider } from '../../_mocks/helpers.test';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { DirectivesModule } from '../../directives/directives.module';
import { PipesModule } from '../../pipes/pipes.module';
import { TranslateModule } from '@ngx-translate/core';

import { NxSearchComponent } from './search.component';
import { NxScrollMechanicsService } from '../../services/scroll-mechanics.service';
import { ActivatedRoute } from '@angular/router';
import { NxSearchService } from '../../services/search.service';
import { NxUriService } from '../../services/uri.service';
import { BehaviorSubject } from 'rxjs';
import { DebugElement } from '@angular/core';
import { FormsModule } from '@angular/forms';

describe('Search Component', () => {
    let component: NxSearchComponent;
    let fixture: ComponentFixture<NxSearchComponent>;
    let el: DebugElement;
    let inputElement: HTMLInputElement;

    const configMock = { config: nxConfig, getConfig: () => nxConfig };
    const langMock = getMockTranslations();
    let params = { search: 'initial search' };
    let url = '/mock/url';
    const locationMock = new BehaviorSubject(null);
    const routeMock = { queryParams: new BehaviorSubject(params) };
    const uriMock = {
        getURI    : () => params,
        getURL    : () => url,
        updateURI : (newUrl, newParams, replaceUrl) => {
            url = newUrl;
            params = newParams;
            routeMock.queryParams.next(params);
            return Promise.resolve();
        }
    };
    let searchService: NxSearchService;
    let searchServiceSpy: jasmine.SpyObj<NxSearchService>;

    beforeEach(
        waitForAsync(() => {
            const spyCreateSearch = jasmine.createSpyObj('NxSearchService', ['getMatchPatterns']);
            TestBed.configureTestingModule({
                declarations : [NxSearchComponent],
                imports      : [
                    CommonModule,
                    FormsModule,
                    DirectivesModule,
                    PipesModule,
                    TranslateModule.forRoot()
                ],
                providers    : [
                    new MockProvider(NxConfigService, configMock),
                    new MockProvider(NxLanguageProviderService, langMock),
                    new MockProvider(ActivatedRoute, routeMock),
                    new MockProvider(Location, locationMock),
                    new MockProvider(NxUriService, uriMock),
                    new MockProvider(NxSearchService, spyCreateSearch),
                    new MockProvider(NxScrollMechanicsService)
                ]
            });

            fixture = TestBed.createComponent(NxSearchComponent);
            component = fixture.componentInstance;
            el = fixture.debugElement;
            searchService = TestBed.inject(NxSearchService);
            searchServiceSpy = TestBed.inject(NxSearchService) as jasmine.SpyObj<NxSearchService>;
            fixture.detectChanges();
            inputElement = el.nativeElement.querySelector('input');
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should update search query', fakeAsync(() => {
        const onSearchType = spyOn(component, 'onSearchType');
        const inputValue = 'updated test';
        inputElement.value = inputValue;
        inputElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(onSearchType).toHaveBeenCalledWith(inputValue);
    }));

    it('should initialize input with query for params', () => {
        expect(inputElement.value).toBe(params.search);
    });

    it('should show the correct placeholder', () => {
        const placeholder = 'Search For Something';
        component.placeholder = placeholder;
        fixture.detectChanges();
        expect(inputElement.placeholder).toBe(placeholder);
    });
});
