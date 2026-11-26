import re
import secrets

PUBLIC_CITIZEN_ID_PATTERN = re.compile(
    r"\AAGL-CIT-[0-9A-F]{24}\Z", re.IGNORECASE | re.ASCII
)


def generate_public_citizen_id() -> str:
    return f"AGL-CIT-{secrets.token_hex(12).upper()}"
