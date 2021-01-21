import traceback
from hashlib import md5
import logging

from django.utils.log import AdminEmailHandler

logger = logging.getLogger(__name__)
DOWNGRADE_ROUTES = ['/api/account', '/api/systems']


class LimitAdminEmailHandler(AdminEmailHandler):
    PERIOD_LENGTH_IN_SECONDS = 60*10  # 10 minutes
    MAX_EMAILS_IN_PERIOD = 1
    KEY_LENGTH = 150
    COUNTER_CACHE_KEY = "email_admins_counter_"

    def increment_counter(self, record):
        key_postfix = record.message[:self.KEY_LENGTH].encode('utf-8')
        key_postfix = md5.update(key_postfix).hexdigest()
        from django.core.cache import cache
        try:
            cache.incr(self.COUNTER_CACHE_KEY + key_postfix)
        except ValueError:
            cache.set(self.COUNTER_CACHE_KEY + key_postfix, 1, self.PERIOD_LENGTH_IN_SECONDS)
        return cache.get(self.COUNTER_CACHE_KEY + key_postfix)

    # noinspection PyBroadException
    def emit(self, record):
        try:
            counter = self.increment_counter(record)
        except Exception:
            print(traceback.format_exc())
        else:
            if counter > self.MAX_EMAILS_IN_PERIOD:
                return
        super(LimitAdminEmailHandler, self).emit(record)


def downgrade_requests(record):
    """Downgrades the loglevel of certain request errors."""
    if record.name == 'django.request':
        # If the user is unauthenticated and the route in the {DOWNGRADE_ROUTES} variable.
        if record.status_code == 401 and not record.request.user.is_authenticated:
            for route in DOWNGRADE_ROUTES:
                if route in record.request.path:
                    logger.info(record.getMessage())
                    return False
        # If the status code is 504 that means clouddb is unavailable or returned nothing.
        elif record.status_code == 504:
            logger.warning(record.getMessage())
            return False
    return True
