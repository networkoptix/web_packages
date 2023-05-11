from cloud.helpers.exceptions import handle_exceptions


async def test_handle_exception(arf, superuser, mock_session):
    """
    Testing using `handle_exception` with async view. Because it is running
    in async context it throws SynchronousOnlyOperation on any DB operation
    such as `request.user.global_permissions`
    """
    @handle_exceptions
    async def async_view(request):
        raise ValueError("Raising test exception")

    req = arf.get('/')
    req.user = superuser
    req.session = mock_session()
    try:
        await async_view(req)
    except Exception:
        raise AssertionError("Must pass smoothly when decorating with handle_exceptions")
