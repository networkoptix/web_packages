import { Component, Input } from '@angular/core';

@Component({
    selector: 'nx-highlighted-string',
    templateUrl: 'highlighted-string.component.html',
    styleUrls: ['highlighted-string.component.scss'],
})
export class HighlightedStringComponent {
    @Input() string: string;
    @Input() token: string;

    get tokenMatches() {
        return this.token && this.matchPosition !== -1;
    }

    get matchPosition() {
        return this.string.toLocaleLowerCase().indexOf(this.token);
    }

    get beforeMatch() {
        if (!this.tokenMatches) {
            return this.string;
        } else {
            return this.string.slice(0, this.matchPosition);
        }
    }

    get afterMatch() {
        if (!this.tokenMatches) {
            return '';
        } else {
            return this.string.slice(this.matchPosition + this.token.length);
        }
    }

    get match() {
        if (!this.tokenMatches) {
            return '';
        } else {
            return this.string.slice(this.matchPosition, this.matchPosition + this.token.length);
        }
    }
}
