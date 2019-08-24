import {
    AfterViewInit, Component, ComponentFactoryResolver, forwardRef, Input, OnDestroy, ViewContainerRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';


export class SaveChanges implements AfterViewInit, OnDestroy {
    component: ViewContainerRef;
    dirty = new Subject<boolean>();
    factoryResolver: ComponentFactoryResolver;
    saveComponent: any;
    watcher: any;

    constructor(factoryResolver: ComponentFactoryResolver,
                viewContainerRef: ViewContainerRef) {
        this.component = viewContainerRef;
        this.factoryResolver = factoryResolver;

        const compFactory = this.factoryResolver.resolveComponentFactory(NxSaveComponent);
        this.component.clear();
        this.saveComponent = this.component.createComponent(compFactory);
    }

    ngAfterViewInit() {
        this.watcher = this.dirty.subscribe((show: boolean) => {
            (<NxSaveComponent>this.saveComponent.instance).needToSave = show;
        });
    }

    ngOnDestroy(): void {
        this.watcher.unsubscribe();
    }

    reset() {
        this.dirty.next(false);
    }

    setSaveFunction(func: any) {
        (<NxSaveComponent>this.saveComponent.instance).save = func;
    }

    touched(event) {
        this.dirty.next(true);
    }
}


@Component({
    selector: 'nx-save',
    templateUrl: 'save.component.html',
    styleUrls: ['save.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxSaveComponent),
            multi: true
        }
    ],
})
export class NxSaveComponent {
    @Input('') needToSave: boolean;
    @Input('') save: any;
    constructor() {
    }
}
