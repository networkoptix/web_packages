def check():
    try:
        # from nx_cloud_api_client.apis import *
        from nx_drf.drf_async import async_api_view
    except Exception:
        raise ImportError("Some of modules cannot be loaded. Please check if PYTHONPATH "
                          "is setup correctly and files exist in a container")
