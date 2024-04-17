from typing import List
from uuid import UUID

from django.db.models import (
    Func,
    Value,
)


class MonthInterval(Func):
    function = "INTERVAL"
    template = "(%(expressions)s * %(function)s '1' MONTH)"


class RemoveArrayElement(Func):
    function = "ARRAY_REMOVE"
    template = "%(function)s(%(expressions)s, '%(element)s')"


class ReplaceAncestors(Func):

    template = "%(expressions)s[:array_length(%(expressions)s, 1) - %(tail_len)s] || %(replacement)s"

    def __init__(
            self,
            old_ancestors: List[UUID],
            new_ancestors: List[UUID],
            output_field=None,
            **extra
    ):
        """
        Expression returning path with replaced ancestors.
        Arguments:
            new_ancestors (List[UUID]): Sub path of new ancestors
            old_ancestors (List[UUID]): Sub path of old ancestors
        """
        self.replacement = Func(
            *new_ancestors,
            function="ARRAY",
            template="%(function)s[%(expressions)s]",
        )
        self.tail_len = Value(len(old_ancestors))
        super().__init__("path", output_field=output_field, **extra)

    def as_sql(
        self,
        compiler,
        connection,
        function=None,
        template=None,
        arg_joiner=None,
        **extra_context,
    ):
        extra_context["tail_len"], tail_params = compiler.compile(self.tail_len)
        extra_context["replacement"], repl_params = compiler.compile(self.replacement)
        sql, params = super().as_sql(compiler, connection, function=function,
                                     template=template, arg_joiner=arg_joiner,
                                     **extra_context)
        params += tail_params
        params += repl_params
        return sql, params


class ToArray(Func):
    function = "ARRAY"
    template = "%(function)s[%(expressions)s]"
