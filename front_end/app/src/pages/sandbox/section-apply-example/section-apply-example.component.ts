import { Component, ViewChild, ViewContainerRef } from '@angular/core';

import { NxApplyService, Watcher, SectionWatcher } from '@services/apply.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxMenuService } from '@src/menu/menu.service';

@Component({
    selector: 'section-apply-example',
    templateUrl: 'section-apply-example.component.html',
    styleUrls: ['section-apply-example.component.scss']
})
export class SectionApplyExampleComponent {
    // Refs to use for rendering apply component instances
    @ViewChild('section1apply', { read: ViewContainerRef, static: true }) section1apply;
    @ViewChild('section2apply', { read: ViewContainerRef, static: true }) section2apply;
    @ViewChild('section3apply', { read: ViewContainerRef, static: true }) section3apply;
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;

    // section 1
    section1InputWatcher = new Watcher<string>();
    section1Watcher: SectionWatcher;
    saveSection1: Process;

    get section1Input() {
        return this.section1InputWatcher.value;
    }

    set section1Input(value) {
        this.section1InputWatcher.value = value;
    }

    // section 2 - Watcher with additional properties
    section2InputWatcher = Watcher.extendedWatcherFactory(null, {
        additionalProperty1: 'additionalProperty1',
        additionalProperty2: 2
    });

    section2Watcher: SectionWatcher;
    saveSection2: Process;

    get section2Input() {
        return this.section2InputWatcher.value;
    }

    set section2Input(value) {
        this.section2InputWatcher.value = value;
    }

    // section 3
    section3InputWatcher = new Watcher<string>();
    section3Watcher: SectionWatcher;
    saveSection3: Process;

    get section3Input() {
        return this.section3InputWatcher.value;
    }

    set section3Input(value) {
        this.section3InputWatcher.value = value;
    }

    // page process
    saveAll: Process;

    constructor(
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit() {
        this.menuService.section = 'components';
        this.menuService.detail = 'applyServiceSection';

        // setup section 1
        this.section1Input = 'section1';
        this.saveSection1 = this.processService
            .createProcess(() => Promise.resolve())
            .then(() => this.section1InputWatcher.reset());
        this.section1Watcher = this.applyService.createSectionWatcher(
            this.section1apply,
            this.saveSection1,
            () => this.section1InputWatcher.reset(),
            [this.section1InputWatcher]
        );

        // setup section 2
        this.section2Input = 'section2';
        this.saveSection2 = this.processService
            .createProcess(() => Promise.resolve())
            .then(() => this.section2InputWatcher.reset());
        this.section2Watcher = this.applyService.createSectionWatcher(
            this.section2apply,
            this.saveSection2,
            () => this.section2InputWatcher.reset(),
            [this.section2InputWatcher]
        );

        // const availableSectionWatchers = [this.section1Watcher, this.section2Watcher];
        const availableSectionWatchers = [];
        this.saveAll = this.processService
            .createProcess(() => Promise.resolve())
            .then(() => {
                availableSectionWatchers.forEach(
                    (watcher: Watcher<any> | SectionWatcher) => {
                        watcher.reset();
                    }
                );
            });
        // Init page watcher with sectionWatchers
        this.applyService.initPageWatcher(
            this.pageApply,
            this.saveAll,
            () => null,
            // () => availableSectionWatchers.forEach(watcher => watcher.reset()),
            availableSectionWatchers
        );

        // setup section 3 - Added using addWatchersAndFunctionsFromChild after page watcher already initialized
        this.section3Input = 'section3';
        this.saveSection3 = this.processService
            .createProcess(() => Promise.resolve())
            .then(() => this.section3InputWatcher.reset());
        this.section3Watcher = this.applyService.createSectionWatcher(
            this.section3apply,
            this.saveSection3,
            () => this.section3InputWatcher.reset(),
            [this.section3InputWatcher]
        );

        // This is how you would add watchers when the page watcher has already been instantiated earlier.
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.section1Watcher],
            this.saveSection1,
            () => this.section1InputWatcher.reset()
        );
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.section2Watcher],
            this.saveSection2,
            () => this.section2InputWatcher.reset()
        );
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.section3Watcher],
            this.saveSection3,
            () => this.section3InputWatcher.reset()
        );

        this.applyService.setVisible();
    }
}
