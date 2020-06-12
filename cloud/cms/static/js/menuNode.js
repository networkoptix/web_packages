document.addEventListener('DOMContentLoaded', function () {
    window.$ = django.jQuery;

    const available = $('.field-available');
    const isGlobal = $('#id_is_global');

    isGlobal.change(function () {
        this.checked ? available.hide() : available.show();
    });

    isGlobal.change();

    $('<button class="enable-all-button btn btn-xs btn-primary ">Enable All Available</button>').insertBefore($('.field-enabled div .related-widget-wrapper .related-widget-wrapper-link'));
    $('.enable-all-button').click(function(event) {
        event.preventDefault();

        if (isGlobal.prop('checked')) {
            $('#id_enabled_add_all_link')[0].click();
        } else {
            $('#id_enabled_remove_all_link')[0].click();
            const availableCustomizations = [];
            $('#id_available_to > option').each(function() {
                availableCustomizations.push(this.value);
            });
            $('#id_enabled_from > option').each(function() {
                if (availableCustomizations.includes(this.value)) {
                    $(this).detach().appendTo('#id_enabled_to');
                }
            });
        }
    });




});
