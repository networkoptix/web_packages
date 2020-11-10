function setPreviewState(asset_id, create_id, el) {
    const params = new URLSearchParams(window.location.search);
    const customization = params.get('customization');
    const selectElement = $(el);
    selectElement.parent().children('.state-label').remove();
    if (customization && customization !== 'all') {
        if (asset_id) {
            $.get(`/admin/cms/asset_state/${asset_id}?customization=${customization}`, function (data) {
                let state = data.state;
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
            });
        }
    }
}

$(document).ready(function() {
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
                    setPreviewState(selectData.id, selectData.create_id, this);
                });
            }
        );
    })(django.jQuery);
});
