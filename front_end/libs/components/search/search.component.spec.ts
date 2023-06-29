import { DebugElement } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { setupComponent } from '../src/setup';

import { NxSearchComponent } from './search.component';

const params = { search: 'initial search' };

const setupSearchComponent = (): ReturnType<typeof setupComponent<NxSearchComponent>> => setupComponent(NxSearchComponent);

const getInputElement = (debugElement: DebugElement): HTMLInputElement => debugElement.nativeElement.querySelector('input');

describe('NxSearchComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupSearchComponent();
        expect(component).toBeTruthy();
    });

    it('should update search query', async () => {
        const { component, debugElement, fixture } = await setupSearchComponent();
        const onSearchType = jest.spyOn(component, 'onSearchType');
        const inputValue = 'updated test';
        const inputElement = getInputElement(debugElement);
        inputElement.value = inputValue;
        inputElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(onSearchType).toHaveBeenCalledWith(inputValue);
    });

    it('should initialize input with query for params', async () => {
        const { debugElement, component, fixture } = await setupSearchComponent();
        (component.route.queryParams as BehaviorSubject<typeof params>).next(params);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(getInputElement(debugElement).value).toBe(params.search);
    });

    it('should show the correct placeholder', async () => {
        const { component, debugElement, fixture } = await setupSearchComponent();
        const placeholder = 'Search For Something';
        component.placeholder = placeholder;
        fixture.detectChanges();
        expect(getInputElement(debugElement).placeholder).toBe(placeholder);
    });
});
