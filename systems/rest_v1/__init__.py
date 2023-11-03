from quart import Blueprint

from .groups import group_blueprint
from .move import move_blueprint
from .users import users_blueprint
# from .users import user_blueprint


rest_blueprint = Blueprint('rest', __name__, url_prefix="/rest/v1")

rest_blueprint.register_blueprint(group_blueprint)
rest_blueprint.register_blueprint(move_blueprint)
rest_blueprint.register_blueprint(users_blueprint)
