async function setPreviewState(asset_id, create_id, el, state) {
    const params = new URLSearchParams(window.location.search);
    const customization = params.get('customization');
    const selectElement = $(el);
    selectElement.parent().children('.state-label').remove();
    let reviewUrl
    if (customization && !all_customizations && asset_id) {
        if (!state) {
            asset = assetInfo[parseInt(asset_id)];
            state = asset.state
            reviewUrl = asset.review_url
        }

        let labelClass;
        if (!create_id) {
            switch (state) {
                case 'Accepted':
                    labelClass = 'label-success';
                    break;
                case 'Rejected':
                    labelClass = 'label-danger';
                    break;
                case 'Pending':
                    labelClass = 'label-warning';
                    break;
                case 'Draft':
                    labelClass = 'label-info';
                    break;
                default:
                    labelClass = 'label-default';
            }
        } else {
            state = 'Draft';
            labelClass = 'label-info';
        }
        const isReview = !!reviewUrl
        const element = isReview ? 'a': 'span'
        const stateLabel = `<${element} class="state-label label ${labelClass}" ${isReview ? `href="${reviewUrl}" target="_blank"`: ''}>${state}</${element}>`;
        selectElement.parent().append(stateLabel);
    }
}

function updateEnabled(id, element, customizations) {
    const enabledContainer = django.jQuery(element).closest('.djn-inline-form').find('.form-row.field-enabled');
    if (all_customizations) {
        const enabledField = enabledContainer.find('select');
        enabledField.multiselect('deselectAll', false);
        enabledField.multiselect('refresh');
        enabledField.multiselect('select', Object.keys(customizations));
    } else {
        const enabledField = enabledContainer.find('input[type="checkbox"]');
        if (Object.values(customizations).includes(customization)) {
            enabledField.prop('checked', true);
        } else {
            enabledField.prop('checked', false);
        }
    }
}
let all_customizations;
let customization;


const duplicateClass = 'duplicate-url'
const removeDuplicateClass = (el) => {
    el.target.parentNode.classList.remove(duplicateClass)
}

const clearMarked = () => {
    document.querySelectorAll(`.${duplicateClass}`).forEach(el => el.classList.remove(duplicateClass))
}

const recursiveExpand = (node) => {
    if (node === document) return
    const expanded = 'node-expanded'
    const item = 'djn-item'
    if (node.classList.contains(item) && !node.classList.contains(expanded)) {
        node.classList.add(expanded)
    }
    recursiveExpand(node.parentNode)
}

const markDuplicates = (ids, expandDuplicates) => {
    ids.forEach(id => {
        const input = document.querySelector(`#${id}`)
        const parent = input.parentNode
        if (!parent.classList.contains(duplicateClass)) {
            parent.classList.add(duplicateClass)
            input.addEventListener('change', checkDuplicateUrls)
        }
        if (expandDuplicates) {
            recursiveExpand(parent.parentNode.parentNode.parentNode.parentNode)
        }
    })
}

const checkDuplicateUrls = (e) => {
    clearMarked()
    const urlCounts = [...document.querySelectorAll('.field-url.custom-input-wrapper')].reduce((counter, cur) => {
        const input = cur.querySelector('input.vTextField')
        if (input.value) {
            counter[input.value] = [...(counter[input.value] || []), input.id]
        }

        return counter
    }, {})
    const duplicates = Object.entries(urlCounts).reduce((flattened, [_, ids]) => ids.length > 1 ? [...flattened, ...ids] : flattened, [])
    if (duplicates.length) {
        const submitted = e instanceof MouseEvent
        if (submitted) {
            e.preventDefault();
            alert('Please fix duplicated node urls before saving')
        }
        markDuplicates(duplicates, submitted)
    }
}


function initNestedScripts() {
    const errorContainer = document.getElementById('menuPreviewErrors');
    const addError = ({ data }) => {
        if (typeof data === 'string') {
            const errorBlock = document.createElement('div');
            errorBlock.className = 'errorBlock';
            errorBlock.appendChild(document.createTextNode(data));
            errorContainer.appendChild(errorBlock);
            window.errorWatcher.value = true;
        }
    }

    const handleAdvancedToggle = ({ target }) => {
        const advancedShown = 'advanced-shown'
        const { classList } = target.parentNode
        const isAdvancedNode = classList.contains('nested-stacked-advanced')
        if (isAdvancedNode) {
            const isShown = classList.contains(advancedShown)
            classList[isShown ? 'remove' : 'add'](advancedShown)
        }
    };
    const handleNodeToggle = ({ target }) => {
        const nodeExpanded = 'node-expanded'
        const isHandle = target.classList.contains('djn-drag-handler')
        const { classList } = target.parentNode
        const isNode = classList.contains('djn-item')
        if (isNode && isHandle) {
            const isShown = classList.contains(nodeExpanded)
            classList[isShown ? 'remove' : 'add'](nodeExpanded)
        }
    };

    window.addEventListener('message', addError);

    const addNodeCounts = () => {
        const parentNodes = document.getElementsByClassName('djn-item')
        for (const node of parentNodes) {
            const nodeHandle = node.getElementsByClassName('djn-drag-handler')[0]
            if (nodeHandle) {
                const { lastElementChild } = node
                const parent = lastElementChild.getElementsByClassName('items')[0]
                const items = parent && parent.children
                let count = 0
                if (items) {
                    for (const { classList } of items) {
                        if (
                            !classList.contains('djn-add-item') &&
                            !classList.contains('djn-no-drag') &&
                            !classList.contains('djn-empty-form')
                        ) {
                            count++
                        }
                    }
                }
                const prevTags = nodeHandle.getElementsByClassName('node-count-tag')
                for (const tag of prevTags) {
                    tag.parentNode.removeChild(tag)
                }
                const inlineDelete = nodeHandle.getElementsByClassName('inline-deletelink').length
                if (!inlineDelete) {
                    const countTag = document.createElement('span')
                    countTag.classList.add('node-count-tag')
                    countTag.innerText = count
                    nodeHandle.appendChild(countTag)
                }

                const deleteNode = nodeHandle.getElementsByClassName('djn-delete-handler')[0]
                const target = node.getElementsByClassName('nested-stacked-heading')[0]
                if (deleteNode) {
                    const removedDeleteNode = nodeHandle.removeChild(deleteNode)
                    target.append(removedDeleteNode)
                }
            }
        }
    }
    const hideNoPreviews = () => {
        const nestedStackedSets = document.getElementsByClassName('nested-stacked-flex')
        for (const set of nestedStackedSets) {
            const previewWrapper = set.getElementsByClassName('form-row field-preview')[0]
            const noPreview = previewWrapper && previewWrapper.lastElementChild && !previewWrapper.lastElementChild.lastElementChild.lastElementChild
            if (noPreview) {
                previewWrapper.style.display = 'none'
            }
        }
    }
    const expandErrors = () => {
        const errorlist = document.getElementsByClassName('errorlist')
            for (const error of errorlist) {
                let parent = error.parentNode
                while (parent && parent.classList) {
                    parent.classList.add('node-expanded')
                    parent = parent.parentNode
                }
            }
    }
    addNodeCounts()
    hideNoPreviews()
    expandErrors()

    window.addEventListener('click', (event) => [
        handleNodeToggle, handleAdvancedToggle
    ].forEach(callback => callback(event)))
    window.addEventListener('mousemove', () => requestAnimationFrame(addNodeCounts))

    const adminConfig = document.getElementsByClassName('field-admin_config')[0]
    const buttonsAdded = adminConfig.classList.contains('reset-buttons-added')
    const configs = {
        "Generic": {
            header: [
              "name",
              "url",
              "enabled",
              "order",
              "preview"
            ],
            details: [
              "asset",
              "icon",
              "authentication"
            ],
            advanced: [
              "related_assets",
              "next_item",
              "subtitle",
              "condition",
              "permissions",
              "new_window",
              "is_global"
            ]
          }
    }
    if (adminConfig && !buttonsAdded) {
        adminConfig.classList.add('reset-buttons-added')
        const buttonWrapper = document.createElement('div')
        const buttonHeading = document.createElement('strong')
        buttonHeading.innerText = 'Reset Config: '
        buttonWrapper.classList.add('reset-buttons-wrapper')
        buttonWrapper.appendChild(buttonHeading)
        adminConfig.children[0].appendChild(buttonWrapper)
        const addButton = ([name, config]) => {
            const button = document.createElement('button')
            button.innerText = name
            button.id = name.replace(' ', '-')
            button.classList.add('btn')
            buttonWrapper.appendChild(button)
            const textInput = document.getElementById('id_admin_config')
            button.addEventListener('click', (event) => {
                event.preventDefault()
                textInput.value = JSON.stringify(configs[name], null, 4)
            })
        }
        Object.entries(configs).forEach(addButton)
    }

    const nestedMenu = document.getElementById('nodes-group')
    const helpText = nestedMenu.querySelectorAll('.help')
    helpText.forEach(node => {
        const parent = node.parentNode
        parent.removeChild(node)
        const tooltip = document.createElement('div')
        tooltip.dataset.toggle = 'tooltip'
        tooltip.classList.add('help-tooltip')
        tooltip.classList.add('glyphicon')
        tooltip.classList.add('glyphicon-info-sign')
        tooltip.title = node.innerText
        parent.appendChild(tooltip)
    })

    const checkAndUpdateLabel = (node, focus = false) => {
        const wrapper = node.parentNode;
        const label = wrapper.querySelector('label')
        if (label && label.innerText.toLowerCase().includes('all')) {
            return
        }
        if (label) {
            label.innerText = label.innerText.replace(':', '')
        }
        const topLabel = label.classList.contains('top-label')
        wrapper.classList.add('custom-input-wrapper')
        wrapper.querySelector('input').addEventListener('change', checkDuplicateUrls)
        label.classList.add('custom-text-label')
        if (node.value || focus) {
            if (!topLabel) {
                label.classList.add('top-label')
            }
        } else if (topLabel && !focus) {
            label.classList.remove('top-label')
        }
    }
    const handleFocus = (event) => checkAndUpdateLabel(event.target, focus)
    const handleBlur = (event) => checkAndUpdateLabel(event.target)

    const addLabelListeners = (delay = 0) => setTimeout(() => nestedMenu.querySelectorAll('.vTextField').forEach((node, ind, arr) => {
        checkAndUpdateLabel(node)
        node.removeEventListener('focus', handleFocus)
        node.removeEventListener('blur', handleBlur)
        node.addEventListener('focus', handleFocus)
        node.addEventListener('blur', handleBlur)
        if (arr.length === ind + 1) {
            addNewNodeListeners()
        }
    }), delay)

    addLabelListeners()

    const addNewNodeListeners = (delay = 0) => setTimeout(() => nestedMenu.querySelectorAll('.djn-add-handler').forEach(node => {
        node.removeEventListener('click', addLabelListeners)
        node.addEventListener('click', addLabelListeners)
    }), delay)

    const widgets = nestedMenu.querySelectorAll('.related-widget-wrapper')
    const selects = nestedMenu.querySelectorAll('select')
    const applyTopLabelStyles = node => {
        const wrapper = node.parentNode;
        wrapper.classList.add('custom-input-wrapper')
        const label = node.parentNode.querySelector('label')
        if (label && label.innerText.toLowerCase().includes('all')) {
            return
        }
        if (label) {
            label.innerText = label.innerText.replace(':', '')
            label.classList.add('custom-text-label')
            label.classList.add('top-label')
        }
    }
    widgets.forEach(applyTopLabelStyles)
    selects.forEach(applyTopLabelStyles)
}

document.querySelectorAll('button[type="submit"]').forEach(button => button.addEventListener('click', checkDuplicateUrls))

$(document).ready(function() {
    customization = new URLSearchParams(window.location.search).get('customization');
    all_customizations = !customization || customization === 'all'
    $('#id_customization_view').change(function(event) {
        // Construct URLSearchParams object instance from current URL querystring.
        var queryParams = new URLSearchParams(window.location.search);

        queryParams.set('customization', this.value);

        window.location.href = window.location.pathname + '?' + queryParams.toString();
    });
    const syncStateNode = document.querySelector('#sync_states')
    if (syncStateNode) {
        const newParent = document.querySelector('.module.aligned ')
        const removedSyncStateNode = syncStateNode.parentNode.removeChild(syncStateNode)
        newParent.appendChild(removedSyncStateNode)
    }
    const selectElements = $('.field-asset select');
    selectElements.each(function (index) {
        const val = $(this).children("option:selected").val();
        setPreviewState(val, false, this);
    });

    (function ($) {
        $(document).on('autocompleteLightInitialize', '[data-autocomplete-light-function=select2]',
            function () {
                $(this).on('select2:selecting', function (evt) {
                    const selectData = evt.params.args.data;
                    const asset_id = selectData.id;
                    const selectEl = this;
                    if (asset_id) {
                        $.get(`/admin/cms/asset_info/${asset_id}?customization=${customization}`, function (data) {
                            setPreviewState(selectData.id, selectData.create_id, selectEl, data.state);
                            updateEnabled(selectData.id, selectEl, data.customizations);
                        });
                    }
                });
            }
        );
    })(django.jQuery);
    setTimeout(initNestedScripts)
});
