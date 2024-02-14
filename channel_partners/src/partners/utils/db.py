from django.db.models import Func


class MonthInterval(Func):
    function = "INTERVAL"
    template = "(%(expressions)s * %(function)s '1' MONTH)"

