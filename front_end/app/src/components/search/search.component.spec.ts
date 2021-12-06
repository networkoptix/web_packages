import { CommonModule, Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed,
    fakeAsync
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { DirectivesModule } from '@directives/directives.module';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSearchService } from '@services/search.service';
import { NxUriService } from '@services/uri.service';
import { HelperMockProvider } from '@src/_mocks/helpers.test';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxSearchComponent } from './search.component';

describe('NxSearchComponent', () => {
    let component: NxSearchComponent;
    let fixture: ComponentFixture<NxSearchComponent>;
    let el: DebugElement;
    let inputElement: HTMLInputElement;

    let params = { search: 'initial search' };
    let url = '/mock/url';
    const locationMock = new BehaviorSubject(null);
    const routeMock = { queryParams: new BehaviorSubject(params) };
    const uriMock = {
        getParams: () => params,
        getURL: () => url,
        updateURI: (newUrl, newParams, replaceUrl) => {
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
            const spyCreateSearch = jasmine.createSpyObj(
                'NxSearchService',
                ['getMatchPatterns']
            );
            TestBed.configureTestingModule({
                declarations: [NxSearchComponent],
                imports: [
                    CommonModule,
                    FormsModule,
                    DirectivesModule,
                    PipesModule,
                    TranslateModule.forRoot(),
                    AngularSvgIconModule,
                    HttpClientTestingModule
                ],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService),
                    MockProvider(NxScrollMechanicsService),
                    new HelperMockProvider(ActivatedRoute, routeMock),
                    new HelperMockProvider(Location, locationMock),
                    new HelperMockProvider(NxUriService, uriMock),
                    new HelperMockProvider(NxSearchService, spyCreateSearch)
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
