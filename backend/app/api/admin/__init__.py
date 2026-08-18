from flask import Blueprint

admin_bp = Blueprint("admin", __name__)

# Import sub-modules to register their routes on the blueprint
from . import auth  # noqa: F401, E402
from . import teachers  # noqa: F401, E402
from . import studios  # noqa: F401, E402
from . import reviews  # noqa: F401, E402
from . import system  # noqa: F401, E402
from . import collaboration  # noqa: F401, E402
from . import assets  # noqa: F401, E402
