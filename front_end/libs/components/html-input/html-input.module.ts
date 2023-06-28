import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';

import { NxHTMLComponent } from './html-input.component';

@NgModule({
    imports: [FormsModule, EditorModule, NxPreLoaderComponent],
    declarations: [NxHTMLComponent],
    providers: [NxHTMLComponent],
    exports: [NxHTMLComponent],
})
export class HtmlInputModule {}
