from flask import Blueprint

mp_bp = Blueprint("mp", __name__)

# Import sub-modules to register their routes on the blueprint
from . import auth  # noqa: F401, E402
from . import teachers  # noqa: F401, E402
from . import studios  # noqa: F401, E402
from . import reviews  # noqa: F401, E402
from . import uploads  # noqa: F401, E402
from . import teaching_records  # noqa: F401, E402
