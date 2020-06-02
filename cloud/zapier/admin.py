from django.contrib import admin
from zapier.models import GeneratedRule, ZapHook


@admin.register(GeneratedRule)
class GeneratedRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "system_id", "times_used", "direction", "caption", "source")
    list_filter = ("email", "system_id", "direction")
    search_fields = ("email", "system_id", "direction", "caption", "source")


@admin.register(ZapHook)
class ZapHookAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "event", "target")
    search_fields = ("user", "event")
