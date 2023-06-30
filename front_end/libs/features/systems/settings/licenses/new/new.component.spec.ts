import { DebugElement } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { testBedSetupFactory } from 'test_utils/test_bed_setup_factory';

import { setupComponent } from '@app/features/src/setup';
import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import {
    NxProcessButtonComponent
} from '@components/process-button/process-button.component';
import { NxProcessService } from '@services/process.service';

import { NxLicenseNewComponent } from './new.component';

const setupNewLicenseComponent = (): ReturnType<typeof setupComponent<NxLicenseNewComponent>> => testBedSetupFactory([
    NxContentBlockComponent,
    NxContentBlockSectionComponent,
    NxProcessButtonComponent,
], [
    MockProvider(NxProcessService),
])(NxLicenseNewComponent);

const getButton = (debugElement: DebugElement) => debugElement.nativeElement.querySelector('nx-process-button').querySelector('button');

describe('Licenses (New)', () => {
    it('should create the component', async () => {
        const { component } = await setupNewLicenseComponent();
        expect(component).toBeTruthy();
    });

    it('should call formatLicenseKey and get formatted key', async () => {
        const { component } = await setupNewLicenseComponent();
        const key = component.formatLicenseKey('0000000000000000');
        expect(key).toBe('0000-0000-0000-0000');
    });

    it('should call changeServer', async () => {
        const { component } = await setupNewLicenseComponent();
        component.changeServer({ name: 'foo', value: 'bar', status: 'baz' });
        expect(component.selectedServer)
            .toEqual({ name: 'foo', value: 'bar', status: 'baz' });
    });

    it('should call displayErrors', async () => {
        const { component } = await setupNewLicenseComponent();
        component.displayErrors();
        expect(component.hideErrors).toBeFalsy();
    });

    it('should call isActivated', async () => {
        const { component } = await setupNewLicenseComponent();
        component.licenses = [{
            key: '0000-0000-0000-0000'
        }];
        const res = component.isActivated('0000000000000000');
        expect(res).toBeTruthy();
    });

    describe('Have elements', () => {
        it('should have button w/ caption', async () => {
            const { debugElement } = await setupNewLicenseComponent();
            expect(getButton(debugElement)).toBeTruthy();
            // nx-process-button caption will contain extra html which at this point is commented out
            expect(getButton(debugElement).innerHTML.replace(/<!--(.*?)-->/g, '')).toBe('Activate');
        });
    });
});
