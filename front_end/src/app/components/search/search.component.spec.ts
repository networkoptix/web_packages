import { CommonModule, Location } from '@angular/common';
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
import { MockProvider, MockModule } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { DirectivesModule } from '@directives/directives.module';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSearchService } from '@services/search.service';
import { NxUriService } from '@services/uri.service';
import { HelperMockProvider } from '@src/_mocks/helpers.test';

import { NxSearchComponent } from './search.component';

describe('NxSearchComponent', () => {
    let component: NxSearchComponent;
    let fixture: ComponentFixture<NxSearchComponent>;
    let el: DebugElement;
    let inputElement: HTMLInputElement;

    const params = { search: 'initial search' };
    const routeMock = { queryParams: new BehaviorSubject(params) };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [NxSearchComponent],
                imports: [
                    MockModule(CommonModule),
                    FormsModule,
                    DirectivesModule,
                    TranslateModule.forRoot(),
                    MockModule(AngularSvgIconModule),
                ],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService),
                    MockProvider(NxScrollMechanicsService),
                    new HelperMockProvider(ActivatedRoute, routeMock),
                    MockProvider(Location),
                    MockProvider(NxUriService),
                    MockProvider(NxSearchService),
                ]
            });

            fixture = TestBed.createComponent(NxSearchComponent);
            component = fixture.componentInstance;
            el = fixture.debugElement;
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
