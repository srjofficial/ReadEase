from fastapi import Header, HTTPException, status
from typing import Optional
import hmac
from app.core.config import settings


async def verify_service_secret(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """
    Security Dependency:
    Enforces that only the authenticated Express backend can invoke this service,
    preventing direct public browser or unauthorized internet invocation.
    Supports 'X-Internal-Service-Key' header or 'Bearer <secret>' authorization.
    """
    token = x_internal_service_key

    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split("Bearer ")[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing internal service authentication key. Access forbidden to public clients.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Constant-time comparison to prevent timing attacks
    is_valid = hmac.compare_digest(token, settings.AI_SERVICE_SECRET)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal service key. Caller is not an authorized ReadEase backend service.",
        )

    return True
