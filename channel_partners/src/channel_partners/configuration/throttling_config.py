def configure_throttling(USER_RATE_LIMIT, ANON_RATE_LIMIT, SYSTEM_RATE_LIMIT):
    classes = []
    rates = {}

    if USER_RATE_LIMIT:
        rates["user"] = USER_RATE_LIMIT
        classes.append("channel_partners.throttling.throttle.AuthenticatedUserRateThrottle")

    if ANON_RATE_LIMIT:
        rates["anon"] = ANON_RATE_LIMIT
        classes.append("channel_partners.throttling.throttle.AnonymousRateThrottle")
    if SYSTEM_RATE_LIMIT:
        rates["system"] = SYSTEM_RATE_LIMIT
        classes.append("channel_partners.throttling.throttle.SystemRateThrottle")

    return {
        "DEFAULT_THROTTLE_CLASSES": classes,
        "DEFAULT_THROTTLE_RATES": rates,
        'THROTTLE_CACHE': 'throttling'
    }
