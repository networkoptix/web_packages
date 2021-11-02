from django.conf import settings
from django.core.cache import caches


def chunked_queryset(queryset, chunk_size):
    """ Slice a queryset into chunks. """

    start_pk = 0
    queryset = queryset.order_by('pk')

    while True:
        # No entry left
        if not queryset.filter(pk__gt=start_pk).exists():
            break

        try:
            # Fetch chunk_size entries if possible
            end_pk = queryset.filter(pk__gt=start_pk).values_list('pk', flat=True)[chunk_size - 1]

            # Fetch rest entries if less than chunk_size left
        except IndexError:
            end_pk = queryset.values_list('pk', flat=True).last()

        yield queryset.filter(pk__gt=start_pk).filter(pk__lte=end_pk)

        start_pk = end_pk


# TODO: Remove when we upgrade to Python 3.9 since it has it as built-in
def remove_suffix(string, suffix):
    if string.endswith(suffix):
        return string[:-len(suffix)]
    return string


def get_authenticated_session_cookie_age():
    if settings.DEBUG:
        session_age = caches['testing'].get('session_age')
        return session_age if session_age is not None else settings._AUTHENTICATED_SESSION_COOKIE_AGE
    else:
        return settings._AUTHENTICATED_SESSION_COOKIE_AGE
