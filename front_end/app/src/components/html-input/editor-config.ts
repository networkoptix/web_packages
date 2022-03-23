function retrieveImageFromClipboardAsBase64(pasteEvent, callback, imageFormat = 'image/png') {
    if (!pasteEvent.clipboardData) {
        if (typeof (callback) === 'function') {
            callback(undefined);
        }
    }

    const items = pasteEvent.clipboardData.items;

    if (!items) {
        if (typeof (callback) === 'function') {
            callback(undefined);
        }
    }

    for (let i = 0; i < items.length; i++) {
        // Skip content if not image
        if (!items[i].type.includes('image')) continue;
        // Retrieve image on clipboard as blob
        const blob = items[i].getAsFile();

        // Create an abstract canvas and get context
        const imageCanvas = document.createElement('canvas');
        const ctx = imageCanvas.getContext('2d');

        // Create an image
        const img = new Image();

        // Once the image loads, render the img on the canvas
        img.onload = function () {
            // Update dimensions of the canvas with the dimensions of the image
            imageCanvas.width = img.width;
            imageCanvas.height = img.height;

            // Draw the image
            ctx.drawImage(img, 0, 0);

            // Execute callback with the base64 URI of the image
            if (typeof (callback) === 'function') {
                callback(imageCanvas.toDataURL(imageFormat));
            }
        };

        // Crossbrowser support for URL
        const URLObj = window.URL || window.webkitURL;

        // Creates a DOMString containing a URL representing the object given in the parameter
        // namely the original Blob
        img.src = URLObj.createObjectURL(blob);
    }
}

function pasteHandleImages(pasteEvent, editor) {
    let clipContent = pasteEvent.clipboardData.getData('text/html');
    const file = [...pasteEvent.clipboardData.items].find(({ type }) => type === 'image/png');

    const addBase64Image = b64Image => {
        if (b64Image) {
            const srcAttr = /src="(.*?)"/igm.exec(clipContent);
            const imageSrc = srcAttr ? srcAttr[1] : '';
            const body = editor.getBody();
            const pastedImgElements = body.querySelectorAll(`img[src="${imageSrc}"]`);
            if (pastedImgElements.length) {
                pastedImgElements.forEach(image => {
                    image.src = b64Image;
                    image.dataset.mceSrc = b64Image;
                });
            } else {
                // CSP or something else blocked it, so we reinsert the image without the URL this time
                const newContent = clipContent.replace(/(.*src=")(.*?)(".*)/igm, '$1' + b64Image + '$3');
                editor.insertContent(newContent);
            }
        }
    };
    if (pasteEvent.clipboardData.types.includes('text/html')) {
        retrieveImageFromClipboardAsBase64(pasteEvent, addBase64Image);
    } else if (file) {
        const blob = file.getAsFile();
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const img = new Image();
        const url = window.URL || window.webkitURL;
        img.onload = function () {
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            clipContent = `<meta charset="utf-8"><img src="" alt="${blob.name} (${img.width}×${img.height})"/>`;
            addBase64Image(tempCanvas.toDataURL('image/png'));
        };
        img.src = url.createObjectURL(blob);
    }
}

export const DEFAULT_EDITOR_CONFIG = {
    base_url: '/static/tinymce',
    suffix: '.min',
    branding: false,
    toolbar: 'undo redo | formatselect link bold italic underline | bullist numlist | outdent indent | code removeformat paste pastetext preview',
    menubar: false,
    paste_data_images: true,
    plugins: 'code, preview, -visualblocks, -advcode,paste, link, lists, autoresize',
    min_height: 360,
    allow_html_in_named_anchor: true,
    extended_valid_elements: '*[*]',
    custom_elements: 'style,link,~link',
    valid_children: '+a[*]',
    closed: /^(br|hr|input|meta|img|link|param|area|path|line)$/,
    protect: [/<svg.*\/svg>/],
    relative_urls: false,
    images_dataimg_filter: () => false,
    paste_preprocess: (plugin, args) => {
        const isImage = args.content.includes('img');
        const validPasteElements = [
            'span',
            'a',
            'b',
            'strong',
            'i',
            'u',
            'em',
            'br',
            'ol',
            'ul',
            'li',
            'p',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
        ];

        function replaceElements(matched, tagName) {
            if (!validPasteElements.includes(tagName)) {
                return '';
            }
            return matched;
        }
        if (isImage) {
            console.info(`Handling pasted image: ${args.content}`);
        } else {
            args.content = args.content.replace(/<\/?([^\s>]*).*?>/g, replaceElements);
            args.content = args.content.replace(/<[^>]*?( class=".*?").*?>/g, '');
        }
    },
    urlconverter_callback: function (url, node) {
        if (url.startsWith('%')) {
            return url;
        }

        const { settings, documentBaseURI } = this as any; // Callback gets attached to JE instance
        // Don't convert link href since thats the CSS files that gets loaded into the editor also skip local file URLs
        if (!settings.convert_urls || (node && node.nodeName === 'LINK') || url.startsWith('file:')) {
            return url;
        }

        // Convert to relative
        if (settings.relative_urls) {
            return documentBaseURI.toRelative(url);
        }

        // Convert to absolute
        url = documentBaseURI.toAbsolute(url, settings.remove_script_host);

        return url;
    },
    setup: function (editor) {
        editor.on('paste', function (event) {
            pasteHandleImages(event, editor);
        });

        editor.on('postProcess', function (e) {
            const mapObj = {
                lineargradient: 'linearGradient',
                filterunits: 'filterUnits',
                feoffset: 'feOffset',
                fegaussianblur: 'feGaussianBlur',
                fecolormatrix: 'feColorMatrix',
                fecomposite: 'feComposite',
                stddeviation: 'stdDeviation'
            };

            const re = new RegExp(Object.keys(mapObj).join('|'), 'g');
            e.content = e.content.replace(re, function (matched) {
                return mapObj[matched];
            });
        });
    }
};
