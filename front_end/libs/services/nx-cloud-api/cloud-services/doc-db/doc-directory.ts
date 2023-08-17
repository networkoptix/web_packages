import { BaseCloudServiceAPI } from '../base-cloud-service-api';

import { DocId } from './doc-db-api.types';
import { DocHandler } from './doc-handler';

/**
 * Handler for working with docDb directories.
 *
 * The class constructor accepts the DocDbAPI as the first argument and the prefix
 * tied to the directory as the second argument.
 */
export class DocDirectory<DocType extends DocId> {
    constructor(private api: BaseCloudServiceAPI, private prefix: string) {}

    /**
     * Creates a DocDirectory for a child directory within the current directory.
     *
     * @param childPrefix additional prefix for storingin docDb
     * @returns DocDirectory<DocType>
     */
    getChildDocDirectory(childPrefix: string): DocDirectory<DocType> {
        return new DocDirectory(this.api, `${this.prefix}/${childPrefix}`);
    }

    /**
     * Created DocHandler for saving and retrieving documents from docDb within
     * the current directory.
     *
     * Note:
     * The handler adds an additional /contents folder to ensure that parent
     * folders don't return documents of child folders.
     *
     * @returns DocHandler<DocType>
     */
    getDocHandler(postFixContents = true): DocHandler<DocType> {
        return new DocHandler(this.api, this.prefix, postFixContents);
    }
}
