import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { LocalStorageService } from 'ngx-webstorage';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
    const configMock = { getConfig: () => nxConfig };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                MockProvider(LocalStorageService),
                MockProvider(WINDOW),
            ],
            declarations: [
                AppComponent
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;

        const config = app['configService'].getConfig();
        config.featureFlags.themesEnabled = true;
        fixture.detectChanges();
        expect(app).toBeTruthy();
    });

    // looks like it was a test created during initial development?
    // it('should render title', () => {
    //     const fixture = TestBed.createComponent(AppComponent);
    //     fixture.detectChanges();
    //     const compiled = fixture.nativeElement;
    //     expect(compiled.querySelector('.content span').textContent).toContain('authorization app is running!');
    // });
});
