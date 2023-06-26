/* eslint-disable @typescript-eslint/no-explicit-any */
import { DialogModule } from '@angular/cdk/dialog';
import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { TranslateModule, TranslateCompiler } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { SessionStorageService, NgxWebstorageModule, InMemoryStorageStrategy, StrategyCacheService } from 'ngx-webstorage';

import { DirectivesModule } from '@app/directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { SystemGuard } from '@app/routeGuards/systemGuard';
import { NxAccountService } from '@app/services/account.service';
import { NxBootstrapProvider } from '@app/services/nx-bootstrap-provider';
import { nxConfig } from '@app/services/nx-config/config';
import { DynamicConfig } from '@app/services/nx-config/dynamic-config';
import { NxConfigService } from '@app/services/nx-config/nx-config.service';
import { ServiceModule } from '@app/services/services.module';
import { WINDOWS_PROVIDERS } from '@app/services/window-provider';
import { accountReducer, AccountSync } from '@app/store/account';
import { SystemsSync } from '@app/store/systems/systems.sync';

export const testBedSetupFactory = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalImports: any[] = [], additionalProviders: any[] = []
) => async <T>(
    TargetComponent: Type<T>,
    standalone = false,
): Promise<{ fixture: ComponentFixture<T>; component: T; getHttpController: () => HttpTestingController }> => {
    NxBootstrapProvider.isLoaded = true;

    /**
     * The common imports and providers are kind of a hack to get unit tests running before we fix
     * issues with our modules. Currently a lot of modules aren't importing or providing all that
     * they need to bootstrap.
     *
     * TODO: Once we have all unit tests running and passing we should work on fixing the modules
     * and probably move a lot to be standalone; after thats done we can start picking off from
     * the commonImports and commonProviders.
     */

    const commonImports = [
        HttpClientModule,
        TranslateModule.forRoot({
            compiler: {
                provide: TranslateCompiler,
                useClass: TranslateMessageFormatCompiler,
            }
        }),
        AngularSvgIconModule.forRoot(),
        NgxWebstorageModule.forRoot(),
        RouterTestingModule,
        DialogModule,
        StoreModule.forRoot({ account: accountReducer }),
        EffectsModule.forRoot([AccountSync, SystemsSync]),
        NoopAnimationsModule,
    ];

    const commonProviders = [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpTestingController,
        WINDOWS_PROVIDERS,
        NxAccountService,
        SystemGuard,
        { provide: DynamicConfig, useValue: new DynamicConfig(nxConfig) },
        {
            provide: NxConfigService,
            useFactory: () => new NxConfigService(window as unknown as Window & { debugConfig: typeof nxConfig; resetConfigOverrides: () => void }, new SessionStorageService(new InMemoryStorageStrategy(new StrategyCacheService())))
        }
    ];

    if (standalone) {
        await TestBed.configureTestingModule({
            imports: [
                ...commonImports,
                TargetComponent,
            ],
            providers: commonProviders,
        }).compileComponents();
    } else {
        await TestBed.configureTestingModule({
            imports: [
                ...commonImports,
                DirectivesModule,
                PipesModule,
                ServiceModule,
                FormsModule,
                ...additionalImports,
            ],
            providers: [
                ...commonProviders,
                ...additionalProviders,
            ],
            declarations: [TargetComponent]
        }).compileComponents();
    }

    const fixture = TestBed.createComponent(TargetComponent);
    fixture.autoDetectChanges();
    const component = fixture.componentInstance;
    const getHttpController = (): HttpTestingController => TestBed.inject(HttpTestingController);
    return { fixture, component, getHttpController };
};
