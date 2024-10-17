/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DebugElement, reflectComponentType, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { TranslateCompiler, TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxIndexedDBModule } from 'ngx-indexed-db';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import {
    InMemoryStorageStrategy,
    NgxWebstorageModule,
    SessionStorageService,
    StrategyCacheService,
} from 'ngx-webstorage';
import * as patchWindow from 'test_utils/patch_window';

import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { dbConfig } from '@services/index_db_config';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import { DynamicConfig } from '@services/nx-config/dynamic-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { WINDOWS_PROVIDERS } from '@services/window-provider';
import { accountReducer, AccountSync } from '@store/account';
import { channelPartnersReducer } from '@store/channel-partners/channel-partners.reducer';
import { SystemsSync } from '@store/systems/systems.sync';

/**
 * The testBedSetupFactory accepts additionalImports and additionalProviders
 * required for the test bed and returns a setup function.
 *
 * The additionalImports and additionalProviders is a workaround for when modules
 * and providers are expected to be provided by the parent module.
 *
 * In general we should be moving towards standalone components where injecting
 * additional modules or providers is not required.
 *
 * Additional imports and providers would still be required when testing some
 * services that are dependent on other services.
 *
 * @param additionalImports - Additional imports to add to the TestBed.
 * @param additionalProviders - Additional providers to add to the TestBed.
 * @returns Component setup function.
 */
export const testBedSetupFactory =
    (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additionalImports: any[] = [],
        additionalProviders: any[] = [],
    ) =>
    /**
     * The setup function optionally accepts a TargetComponent and initial values to set on the component.
     *
     * The setup function can also be used to setup a TestBed without a TargetComponent for testing
     * services and other injectables using the inject method returned from the setup function.
     *
     * @param TargetComponent - The component to initiailize the TestBed.
     * @param initialValues - Initial values to set on the component.
     * @returns Promise<ConfiguredTestBed<T>> - The configured TestBed.
     */
    async <T>(
        TargetComponent?: Type<T>,
        initialValues: Partial<T> = {},
        additionalImportsForComponent: any[] = [],
        additionalProvidersForComponent: any[] = [],
        /**
         * TODO: Need to figure out how to better type this once the implementation is stable.
         */
    ): Promise<{
        /**
         * The test bed fixture created by TestBed.createComponent(TargetComponent)
         */
        fixture?: ComponentFixture<T>;
        /**
         * The component instance.
         */
        component?: T;
        /**
         * DebugElement ref for the component.
         */
        debugElement?: DebugElement;
        /**
         * Getter function to inject the HttpTestingController for the TestBed.
         *
         * The HttpTestingController allows for mocking and flushing of requests.
         *
         * @returns {HttpTestingController} - The HttpTestingController for the TestBed.
         */
        getHttpController: () => HttpTestingController;
        /**
         * Injects additional providers into the TestBed. Usually the services
         * injected would be the system under
         */
        inject: typeof TestBed.inject;
        patchWindow: typeof patchWindow;
        tick: (time?: number) => Promise<unknown>;
        /**
         * Runs fixture.detectChanges for components and TestBed.flushEffects for services.
         * @returns {void}
         */
        detectChanges: () => void;
    }> => {
        if (additionalImportsForComponent.length) {
            additionalImports = [...additionalImports, ...additionalImportsForComponent];
        }

        if (additionalProvidersForComponent.length) {
            additionalProviders = [...additionalProviders, ...additionalProvidersForComponent];
        }

        NxBootstrapProvider.isLoaded = true;

        const isDialog = 'dialogData' in initialValues;

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
            BrowserModule,
            HttpClientModule,
            TranslateModule.forRoot({
                compiler: {
                    provide: TranslateCompiler,
                    useClass: TranslateMessageFormatCompiler,
                },
            }),
            AngularSvgIconModule.forRoot(),
            NgxWebstorageModule.forRoot(),
            RouterTestingModule,
            DialogModule,
            StoreModule.forRoot({ account: accountReducer }),
            StoreModule.forFeature('channelPartners', channelPartnersReducer),
            EffectsModule.forRoot([AccountSync, SystemsSync]),
            NoopAnimationsModule,
            NgxIndexedDBModule.forRoot(dbConfig),
        ];

        const commonProviders = [
            provideHttpClient(),
            provideHttpClientTesting(),
            HttpTestingController,
            WINDOWS_PROVIDERS,
            NxAccountService,
            { provide: DynamicConfig, useValue: new DynamicConfig(nxConfig) },
            {
                provide: NxConfigService,
                useFactory: () =>
                    new NxConfigService(
                        new SessionStorageService(
                            new InMemoryStorageStrategy(new StrategyCacheService()),
                        ),
                    ),
            },
            ...(isDialog
                ? [
                      { provide: DialogRef, useValue: {} },
                      { provide: DIALOG_DATA, useValue: { action: initialValues.dialogData } },
                  ]
                : []),
        ];

        const standalone = TargetComponent && reflectComponentType(TargetComponent).isStandalone;

        if (standalone) {
            await TestBed.configureTestingModule({
                imports: [...commonImports, TargetComponent],
                providers: [...commonProviders, ...additionalProviders],
            }).compileComponents();
        } else {
            await TestBed.configureTestingModule({
                imports: [
                    ...commonImports,
                    PipesModule,
                    ServiceModule,
                    FormsModule,
                    ...additionalImports,
                ],
                providers: [...commonProviders, ...additionalProviders],
                declarations: TargetComponent ? [TargetComponent] : [],
            }).compileComponents();
        }

        const getHttpController = (): HttpTestingController =>
            TestBed.inject(HttpTestingController);
        const { inject } = TestBed;

        const tick = (time: number = 0): Promise<unknown> =>
            new Promise(resolve => setTimeout(resolve, time));

        if (!TargetComponent) {
            return {
                getHttpController,
                inject,
                patchWindow,
                tick,
                detectChanges: TestBed.flushEffects,
            };
        }

        const fixture = TestBed.createComponent(TargetComponent);

        if (initialValues) {
            Object.assign(fixture.componentInstance, initialValues);
        }

        fixture.autoDetectChanges();
        await fixture.whenRenderingDone();
        const { debugElement, componentInstance: component } = fixture;

        if (isDialog) {
            await tick();
        }

        return {
            fixture,
            component,
            debugElement,
            getHttpController,
            inject,
            patchWindow,
            tick,
            detectChanges: () => fixture.detectChanges(),
        };
    };
