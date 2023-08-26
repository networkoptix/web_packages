import { DocDbAPI } from './doc-db-api';
import { DocId } from './doc-db-api.types';
import { DocHandler } from './doc-handler';

/**
 * Handler for working with docDb directories.
 *
 * The class constructor accepts the DocDbAPI as the first argument and the prefix
 * tied to the directory as the second argument.
 *
 * Optionally also accepts a nameSpaceForUser boolean as the third argument that defaults to true.
 *
 * The nameSpaceForUser argument should be set to false when working with directories that are not user
 * specific and are potentially shared between users; an example being cross system layouts. For user
 * specific data such as unsavedLayouts then the prefix is updated with a sha256 hash of the user's email.
 *
 * See https://networkoptix.atlassian.net/wiki/spaces/PM/pages/2694250499/JSON+document+storage#HTTP-API
 * for documentation regarding the need for unique doc paths and why we want to prevent collisions
 * between users.
 */
export class DocDirectory<DocType extends DocId> {
    constructor(private api: DocDbAPI, private prefix: string, private nameSpaceForUser = true) {}

    /**
     * Creates a DocDirectory for a child directory within the current directory.
     *
     * @param childPrefix additional prefix for storingin docDb
     * @returns DocDirectory<DocType>
     */
    getChildDocDirectory(childPrefix: string): DocDirectory<DocType> {
        return new DocDirectory(this.api, `${this.prefix}/${childPrefix}`, this.nameSpaceForUser);
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
    getDocHandler(...subDirectories: string[]): DocHandler<DocType>;
    getDocHandler(postFixContents: boolean, ...subDirectories: string[]): DocHandler<DocType>;
    getDocHandler(
        postFixContentsOrDirectory: boolean | string = true,
        ...subDirectories: string[]
    ): DocHandler<DocType> {
        const firstIsPostFixContents = typeof postFixContentsOrDirectory === 'boolean';
        const postFixContents = firstIsPostFixContents ? postFixContentsOrDirectory : true;
        subDirectories = firstIsPostFixContents
            ? subDirectories
            : [postFixContentsOrDirectory, ...subDirectories];

        if (subDirectories.length) {
            const directory = subDirectories.reduce(
                (docDirectory, subDirectory) => docDirectory.getChildDocDirectory(subDirectory),
                this,
            );
            return directory.getDocHandler(postFixContents);
        }

        return new DocHandler(this.api, this.prefix, postFixContents, this.nameSpaceForUser);
    }
}
