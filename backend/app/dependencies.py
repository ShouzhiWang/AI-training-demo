from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.config import Settings, get_settings
from app.models import CurrentUser


bearer = HTTPBearer(auto_error=False)


def get_service_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Client:
    if not settings.supabase_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend Supabase credentials are not configured.",
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer token required")
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Supabase URL is not configured")

    auth_key = settings.supabase_publishable_key or settings.supabase_service_key
    if not auth_key:
        raise HTTPException(status_code=503, detail="Supabase auth key is not configured")

    try:
        auth_client = create_client(settings.supabase_url, auth_key)
        response = auth_client.auth.get_user(credentials.credentials)
        if response.user is None:
            raise ValueError("Missing user")
        service = (
            create_client(settings.supabase_url, settings.supabase_service_key)
            if settings.supabase_service_key
            else None
        )
        profile = None
        if service:
            result = (
                service.table("user_profiles")
                .select("email,name,role")
                .eq("id", str(response.user.id))
                .maybe_single()
                .execute()
            )
            profile = result.data
        metadata = response.user.user_metadata or {}
        email = (profile or {}).get("email") or response.user.email or ""
        name = (
            (profile or {}).get("name")
            or metadata.get("full_name")
            or metadata.get("name")
            or email.split("@")[0]
            or "Student"
        )
        role = (profile or {}).get("role", "student")
        if role not in {"student", "teacher", "admin"}:
            role = "student"
        return CurrentUser(
            id=response.user.id,
            email=email,
            name=name,
            role=role,
            token=credentials.credentials,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


async def require_educator(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if user.role not in {"teacher", "admin"}:
        raise HTTPException(status_code=403, detail="Teacher or admin role required")
    return user

