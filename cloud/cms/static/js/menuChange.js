async function setPreviewState(asset_id, create_id, el, state) {
    const params = new URLSearchParams(window.location.search);
    const customization = params.get('customization');
    const selectElement = $(el);
    selectElement.parent().children('.state-label').remove();
    if (customization && !all_customizations && asset_id) {
        if (!state) {
            state = (await $.get(`/admin/cms/asset_info/${asset_id}?customization=${customization}`)).state;
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
        const stateLabel = `<span class="state-label label ${labelClass}">${state}</span>`;
        selectElement.parent().append(stateLabel);
    }
}

function updateEnabled(id, element, customizations) {
    const enabledContainer = django.jQuery(element).closest('.field-asset').siblings('.field-enabled');
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
$(document).ready(function() {
    customization = new URLSearchParams(window.location.search).get('customization');
    all_customizations = !customization || customization === 'all'
    $('#id_customization_view').change(function(event) {
        // Construct URLSearchParams object instance from current URL querystring.
        var queryParams = new URLSearchParams(window.location.search);

        queryParams.set('customization', this.value);

        window.location.href = window.location.pathname + '?' + queryParams.toString();
    });

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
});
