from django import template

register = template.Library()


@register.simple_tag
def url_replace(request, field, value):
    dict_ = request.GET.copy()
    dict_[field] = value
    return dict_.urlencode()


@register.filter
def escape_ds_name(name):
    return name.replace('%', '\%')


@register.filter
def trim_prefix(prefix):
    end = prefix.split('-')[-1]
    return prefix.rstrip(f'-{end}')


# Place breakpoint for debugging values of template context
@register.filter
def test_filter(r):
    return r
