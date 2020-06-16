import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

/* Usage
 */

@Component({
    selector    : 'nx-level-2-item',
    templateUrl : 'level-2-item.component.html',
    styleUrls   : ['level-2-item.component.scss']
})
export class NxLevel2ItemComponent implements OnInit {
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;

    itemPath: string;
    isEnabled: boolean;

    constructor() {
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.isEnabled = this.item.isEnabled === undefined ? true : this.item.isEnabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item?.currentValue) {
            this.isEnabled = changes.item.currentValue.isEnabled;
            this.item.additionalText = (typeof changes.item.currentValue.additionalLabel === 'function')
                ? changes.item.currentValue.additionalLabel() : changes.item.currentValue.additionalLabel;
        }
    }
}
