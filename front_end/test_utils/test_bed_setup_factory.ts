/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DebugElement, reflectComponentType, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { TranslateModule, TranslateCompiler } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import {
    SessionStorageService,
    NgxWebstorageModule,
    InMemoryStorageStrategy,
    StrategyCacheService,
} from 'ngx-webstorage';
import * as patchWindow from 'test_utils/patch_window';

import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import { DynamicConfig } from '@services/nx-config/dynamic-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServiceModule } from '@services/services.module';
import { WINDOWS_PROVIDERS } from '@services/window-provider';
import { accountReducer, AccountSync } from '@store/account';
import { SystemsSync } from '@store/systems/systems.sync';

export const testBedSetupFactory =
    (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additionalImports: any[] = [],
        additionalProviders: any[] = [],
    ) =>
    async <T>(
        TargetComponent?: Type<T>,
        initialValues: Partial<T> = {},
        /**
         * TODO: Need to figure out how to better type this once the implementation is stable.
         */
    ): Promise<{
        fixture?: ComponentFixture<T>;
        component?: T;
        debugElement?: DebugElement;
        getHttpController: () => HttpTestingController;
        inject: typeof TestBed.inject;
        patchWindow: typeof patchWindow;
        tick: (time?: number) => Promise<unknown>;
    }> => {
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
            EffectsModule.forRoot([AccountSync, SystemsSync]),
            NoopAnimationsModule,
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
                providers: commonProviders,
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

        return { fixture, component, debugElement, getHttpController, inject, patchWindow, tick };
    };
