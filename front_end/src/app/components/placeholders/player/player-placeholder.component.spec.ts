import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxPlayerPlaceholderComponent } from './player-placeholder.component';

describe('NxPlayerPlaceholderComponent', () => {
    let component: NxPlayerPlaceholderComponent;
    let fixture: ComponentFixture<NxPlayerPlaceholderComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [AngularSvgIconModule.forRoot(), HttpClientTestingModule],
            declarations: [NxPlayerPlaceholderComponent],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService)
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NxPlayerPlaceholderComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;

        component.heading = 'ERROR';
        component.description = 'Some error';
        component.svgFileName = 'placeholder_camera_offline';
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should init element', () => {
        fixture.detectChanges();
        const heading = el.nativeElement.querySelector('.heading');
        const description = el.nativeElement.querySelector('.description');
        expect(heading.innerText).toBe('ERROR');
        expect(description.innerText).toBe('Some error');
    });

    it('should set height', () => {
        const height = '64';
        component.height = height;
        fixture.detectChanges();
        expect(component.height).toBe(height);
    });

    it('should set height default', () => {
        fixture.detectChanges();
        expect(component.height).toBe('96');
    });
});
