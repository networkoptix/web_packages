import inspect
from typing import (
    Any,
    Callable,
    Dict,
    Optional,
    Sequence,
    Union,
)

from drf_spectacular.utils import (
    F,
    OpenApiCallback,
    OpenApiExample,
    OpenApiParameter,
    _SchemaType,
    _SerializerType,
    _StrOrPromise,
    empty,
    error,
    extend_schema,
    extend_schema_view,
    get_view_method_names,
    isolate_view_method,
)
from rest_framework.serializers import (
    ListSerializer,
    Serializer,
)
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from tools.versioning.utils import (
    Versions,
    versioned_serializer,
)
from tools.versioning.views import VersionedViewMixin


def version_range(versions: Versions, actions: Optional[Dict[str, Versions]] = None):
    available_actions = ['create', 'list', 'retrieve', 'update', 'partial_update', 'destroy']

    def decorator(cls):
        if inspect.isclass(cls) and issubclass(cls, VersionedViewMixin):
            # Versioned viewset decoration
            cls.versions = versions
            if actions:
                # if actions defined, decorate the standard actions, to assign versions to handler
                # function and decorate them with `extend_schema(deprecated=True)` if needed.
                valid_actions = [
                    action
                    for action in actions.keys()
                    if hasattr(cls, action) and action in available_actions
                ]
                if len(valid_actions) != len(actions):
                    raise ValueError("Invalid actions provided.")
                cls.actions_versions = actions

                extend_action = {
                    action: extend_schema(deprecated=True, versions=action_versions.deprecated_versions)
                    for action, action_versions in actions.items()
                }
                if extend_action:
                    cls = extend_schema_view(**extend_action)(cls)
        elif hasattr(cls, 'cls') and issubclass(cls.cls, APIView):
            # Function-based view decoration. Function-based views handler bound to a subclass of APIView.
            cls.cls.versions = versions
        else:
            # Method decoration for actions handlers of viewsets.
            # Custom actions handler functions bound to a viewset class, we cannot alter the class itself.
            # So we alter init arguments.
            cls.versions = versions
            kwargs = {
                'versions': versions,
            }
            if hasattr(cls, 'kwargs'):
                cls.kwargs.update(kwargs)
            elif hasattr(cls, 'view_class'):
                cls.view_initkwargs.update(kwargs)
            elif hasattr(cls, 'initkwargs'):
                cls.initkwargs.update(kwargs)
            elif cls.__name__ not in available_actions:
                raise TypeError("The decorated object must be a class or a method of a class "
                                "or a function-based view or viewset standard action handler.")
        if versions.deprecated_in:
            cls = extend_schema(deprecated=True, versions=versions.deprecated_versions)(cls)
        return cls

    return decorator

def get_schema_response(response, request):
    """
    Get the response serializer based on serializer class and the request version.
    :param response: response defined in extend_schema
    :param request: request object
    :return:
    """
    if isinstance(response, ListSerializer):
        # ListSerializer initialized with many=True in extend_schema
        response_class = response.child.__class__
        serializer_class = versioned_serializer(response_class, request.version)
        return serializer_class(many=True)
    if inspect.isclass(response) and issubclass(response, Serializer):
        # Serializer defined by class in extend_schema
        return versioned_serializer(response, request.version)
    if isinstance(response, Serializer):
        # Serializer defined by instance in extend_schema
        return versioned_serializer(response.__class__, request.version)
    return response


def nx_extend_schema(
        operation_id: Optional[str] = None,
        parameters: Optional[Sequence[Union[OpenApiParameter, _SerializerType]]] = None,
        request: Any = empty,
        responses: Any = empty,
        auth: Optional[Sequence[str]] = None,
        description: Optional[_StrOrPromise] = None,
        summary: Optional[_StrOrPromise] = None,
        deprecated: Optional[bool] = None,
        tags: Optional[Sequence[str]] = None,
        filters: Optional[bool] = None,
        exclude: Optional[bool] = None,
        operation: Optional[_SchemaType] = None,
        methods: Optional[Sequence[str]] = None,
        versions: Optional[Sequence[str]] = None,
        examples: Optional[Sequence[OpenApiExample]] = None,
        extensions: Optional[Dict[str, Any]] = None,
        callbacks: Optional[Sequence[OpenApiCallback]] = None,
        external_docs: Optional[Union[Dict[str, str], str]] = None,
) -> Callable[[F], F]:
    """
    Decorator mainly for the "view" method kind. Partially or completely overrides
    what would be otherwise generated by drf-spectacular.

    :param operation_id: replaces the auto-generated operation_id. make sure there
        are no naming collisions.
    :param parameters: list of additional or replacement parameters added to the
        auto-discovered fields.
    :param responses: replaces the discovered Serializer. Takes a variety of
        inputs that can be used individually or combined

        - ``Serializer`` class
        - ``Serializer`` instance (e.g. ``Serializer(many=True)`` for listings)
        - basic types or instances of ``OpenApiTypes``
        - :class:`.OpenApiResponse` for bundling any of the other choices together with
          either a dedicated response description and/or examples.
        - :class:`.PolymorphicProxySerializer` for signaling that
          the operation may yield data from different serializers depending
          on the circumstances.
        - ``dict`` with status codes as keys and one of the above as values.
          Additionally in this case, it is also possible to provide a raw schema dict
          as value.
        - ``dict`` with tuples (status_code, media_type) as keys and one of the above
          as values. Additionally in this case, it is also possible to provide a raw
          schema dict as value.
    :param request: replaces the discovered ``Serializer``. Takes a variety of inputs

        - ``Serializer`` class/instance
        - basic types or instances of ``OpenApiTypes``
        - :class:`.PolymorphicProxySerializer` for signaling that the operation
          accepts a set of different types of objects.
        - ``dict`` with media_type as keys and one of the above as values. Additionally, in
          this case, it is also possible to provide a raw schema dict as value.
    :param auth: replace discovered auth with explicit list of auth methods
    :param description: replaces discovered doc strings
    :param summary: an optional short summary of the description
    :param deprecated: mark operation as deprecated
    :param tags: override default list of tags
    :param filters: ignore list detection and forcefully enable/disable filter discovery
    :param exclude: set True to exclude operation from schema
    :param operation: manually override what auto-discovery would generate. you must
        provide a OpenAPI3-compliant dictionary that gets directly translated to YAML.
    :param methods: scope extend_schema to specific methods. matches all by default.
    :param versions: scope extend_schema to specific API version. matches all by default.
    :param examples: attach request/response examples to the operation
    :param extensions: specification extensions, e.g. ``x-badges``, ``x-code-samples``, etc.
    :param callbacks: associate callbacks with this endpoint
    :param external_docs: Link external documentation. Provide a dict with an "url" key and
        optionally a "description" key. For convenience, if only a string is given it is
        treated as the URL.
    :return:
    """
    if methods is not None:
        methods = [method.upper() for method in methods]

    def decorator(f):
        BaseSchema = (
            # explicit manually set schema or previous view annotation
            getattr(f, 'schema', None)
            # previously set schema with @extend_schema on views methods
            or getattr(f, 'kwargs', {}).get('schema', None)
            # previously set schema with @extend_schema on @api_view
            or getattr(getattr(f, 'cls', None), 'kwargs', {}).get('schema', None)
            # the default
            or api_settings.DEFAULT_SCHEMA_CLASS
        )

        if not inspect.isclass(BaseSchema):
            BaseSchema = BaseSchema.__class__

        def is_in_scope(ext_schema):
            version, _ = ext_schema.view.determine_version(
                ext_schema.view.request,
                **ext_schema.view.kwargs
            )
            version_scope = versions is None or version in versions
            method_scope = methods is None or ext_schema.method in methods
            return method_scope and version_scope

        class ExtendedSchema(BaseSchema):
            def get_operation(self, path, path_regex, path_prefix, method, registry):
                self.method = method.upper()

                if operation is not None and is_in_scope(self):
                    return operation
                return super().get_operation(path, path_regex, path_prefix, method, registry)

            def is_excluded(self):
                if exclude is not None and is_in_scope(self):
                    return exclude
                return super().is_excluded()

            def get_operation_id(self):
                if operation_id and is_in_scope(self):
                    return operation_id
                return super().get_operation_id()

            def get_override_parameters(self):
                if parameters and is_in_scope(self):
                    return super().get_override_parameters() + parameters
                return super().get_override_parameters()

            def get_auth(self):
                if auth is not None and is_in_scope(self):
                    return auth
                return super().get_auth()

            def get_examples(self):
                if examples and is_in_scope(self):
                    return super().get_examples() + examples
                return super().get_examples()

            def get_request_serializer(self):
                if request is not empty and is_in_scope(self):
                    if hasattr(self.view, 'versions'):
                        return versioned_serializer(request, self.view.request.version)
                    return request
                return super().get_request_serializer()

            def get_response_serializers(self):
                # responses can be a dict, a serializer, openapi type, or a dict of media types
                if responses is not empty and is_in_scope(self):
                    if hasattr(self.view, 'versions'):
                        if issubclass(responses.__class__, Serializer):
                            return get_schema_response(responses, self.view.request)
                        elif isinstance(responses, dict):
                            new_responses = {}
                            for status_code, response in responses.items():
                                new_responses[status_code] = get_schema_response(response, self.view.request)
                            return new_responses
                    return responses
                return super().get_response_serializers()

            def get_description(self):
                if description and is_in_scope(self):
                    return description
                return super().get_description()

            def get_summary(self):
                if summary and is_in_scope(self):
                    return str(summary)
                return super().get_summary()

            def is_deprecated(self):
                if deprecated and is_in_scope(self):
                    return deprecated
                return super().is_deprecated()

            def get_tags(self):
                if tags is not None and is_in_scope(self):
                    return tags
                return super().get_tags()

            def get_extensions(self):
                if extensions and is_in_scope(self):
                    return extensions
                return super().get_extensions()

            def get_filter_backends(self):
                if filters is not None and is_in_scope(self):
                    return getattr(self.view, 'filter_backends', []) if filters else []
                return super().get_filter_backends()

            def get_callbacks(self):
                if callbacks is not None and is_in_scope(self):
                    return callbacks
                return super().get_callbacks()

            def get_external_docs(self):
                if external_docs is not None and is_in_scope(self):
                    return external_docs
                return super().get_external_docs()

        if inspect.isclass(f):
            # either direct decoration of views, or unpacked @api_view from OpenApiViewExtension
            if operation_id is not None or operation is not None:
                error(
                    f'using @extend_schema on viewset class {f.__name__} with parameters '
                    f'operation_id or operation will most likely result in a broken schema.',
                    delayed=f,
                )
            # reorder schema class MRO so that view method annotation takes precedence
            # over view class annotation. only relevant if there is a method annotation
            for view_method_name in get_view_method_names(view=f, schema=BaseSchema):
                if 'schema' not in getattr(getattr(f, view_method_name), 'kwargs', {}):
                    continue
                view_method = isolate_view_method(f, view_method_name)
                view_method.kwargs['schema'] = type(
                    'ExtendedMetaSchema', (view_method.kwargs['schema'], ExtendedSchema), {}
                )
            # persist schema on class to provide annotation to derived view methods.
            # the second purpose is to serve as base for view multi-annotation
            f.schema = ExtendedSchema()
            return f
        elif callable(f) and hasattr(f, 'cls'):
            # 'cls' attr signals that as_view() was called, which only applies to @api_view.
            # keep a "unused" schema reference at root level for multi annotation convenience.
            setattr(f.cls, 'kwargs', {'schema': ExtendedSchema})
            # set schema on method kwargs context to emulate regular view behaviour.
            for method in f.cls.http_method_names:
                setattr(getattr(f.cls, method), 'kwargs', {'schema': ExtendedSchema})
            return f
        elif callable(f):
            # custom actions have kwargs in their context, others don't. create it so our create_view
            # implementation can overwrite the default schema
            if not hasattr(f, 'kwargs'):
                f.kwargs = {}
            # this simulates what @action is actually doing. somewhere along the line in this process
            # the schema is picked up from kwargs and used. it's involved my dear friends.
            # use class instead of instance due to descriptor weakref reverse collisions
            f.kwargs['schema'] = ExtendedSchema
            return f
        else:
            return f

    return decorator
