from django.forms.widgets import SelectMultiple
import json


class BootstrapMultiSelect(SelectMultiple):
    template_name = 'cms/widgets/bootstrap-multiselect.html'

    class Media:
        css = {
            'all': ('css/bootstrap-multiselect.css',)
        }
        js = ('js/bootstrap-multiselect.js',)

    # field_name must be passed in so the widget knows which outer classes to modify
    def __init__(self, field_name, *args, **kwargs):
        self.options = kwargs.pop('options', {})
        self.field_name = field_name
        super().__init__(*args, **kwargs)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context['widget']['options_json'] = json.dumps(self.options)
        context['widget']['field_name'] = self.field_name
        return context
