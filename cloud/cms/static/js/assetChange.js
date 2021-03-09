function show_customizations(show) {
    customizations = $('.field-customizations');
    if (show)
        customizations.show();
    else
        customizations.hide();
}

function onAssetTypeChanged() {
    if ($("option:selected", this).text() === 'Documentation Page') {
        menuField.show();
    } else {
        menuField.hide();
    }
}

$(document).ready(function() {
    publishAllDiv = $('.field-publish_all_customizations');
    if(publishAllDiv.length) {
        publishAllField = publishAllDiv.find('input').first();
        publishAllField.change(function() {
            show_customizations(!this.checked);
        });

        publishAllField.change();
    }

    assetTypeField = $('#id_asset_type');
    menuField = $('div.field-menu');
    if (menuField.length) {
        onAssetTypeChanged();
        assetTypeField.change(onAssetTypeChanged);
    }
});