import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { NxHTMLComponent } from './html-input.component';

@NgModule({
    imports: [FormsModule, EditorModule, PreLoaderModule],
    declarations: [NxHTMLComponent],
    providers: [NxHTMLComponent],
    exports: [NxHTMLComponent],
})
export class HtmlInputModule {}
