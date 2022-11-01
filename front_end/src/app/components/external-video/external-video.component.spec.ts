import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config/nx-config.service';

import { NxExternalVideoComponent } from './external-video.component';

describe('NxExternalVideoComponent', () => {
    let component: NxExternalVideoComponent;
    let fixture: ComponentFixture<NxExternalVideoComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxExternalVideoComponent],
            imports: [CommonModule, HttpClientTestingModule],
            providers: [
                MockProvider(NxConfigService)
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxExternalVideoComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                component.videoSrc = 'https://www.youtube.com/watch?v=2suNl4Yo3uM&ab_channel=NetworkOptix';
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should show basic component for youtube link', () => {
        fixture.detectChanges();
        const frameDiv = el.nativeElement.querySelector('div.embed-responsive');
        const iFrame = el.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeTruthy();
        expect(iFrame).toBeTruthy();
    });

    it('should show basic component for vimeo link', () => {
        component.videoSrc = 'https://vimeo.com/269230259';
        fixture.detectChanges();
        const frameDiv = el.nativeElement.querySelector('div.embed-responsive');
        const iFrame = el.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeTruthy();
        expect(iFrame).toBeTruthy();
    });

    it('should not show for videos not Youtube or Vimeo', () => {
        component.videoSrc = 'https://www.dailymotion.com/video/x84kg5v?playlist=x6lgtp';
        fixture.detectChanges();
        const frameDiv = el.nativeElement.querySelector('div.embed-responsive');
        const iFrame = el.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeFalsy();
        expect(iFrame).toBeFalsy();
    });
});
