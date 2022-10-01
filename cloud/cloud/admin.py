from functools import update_wrapper

from django.contrib.admin import AdminSite, site
from django.shortcuts import redirect
from django.utils.http import urlencode
from django.views.decorators.csrf import csrf_protect

from cms.models import ContributorAgreement

class CMSAdminSite(AdminSite):
    index_template = 'admin/index.html'
    site_header = 'Cloud Administration'
    site_title = 'Cloud Administration'
    index_title = 'Cloud Administration'

    def admin_view(self, view, cacheable=False):
        def force_agreement(request, *args, **kwargs):
            if request.user.is_authenticated and request.user.is_staff and not request.user.is_superuser:
                agreement = ContributorAgreement.get_current(request=request)
                if agreement and \
                        not ContributorAgreement.objects.filter(
                            user=request.user, accepted_agreement=agreement
                        ).exists():
                    redirect_query_params = {'next': request.get_full_path()}
                    return redirect(f'/agreement?{urlencode(redirect_query_params)}')
            return wrapped_view(request, *args, **kwargs)

        force_agreement = csrf_protect(force_agreement)
        wrapped_view = super().admin_view(view, cacheable)
        return update_wrapper(force_agreement, wrapped_view)
