from typing import Annotated

from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_service_client, require_educator
from app.models import AdminStats, CurrentUser
from app.services.admin_service import AdminService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def stats(
    _: Annotated[CurrentUser, Depends(require_educator)],
    client: Annotated[Client, Depends(get_service_client)],
):
    return AdminService(client).stats()


@router.get("/students")
async def students(
    _: Annotated[CurrentUser, Depends(require_educator)],
    client: Annotated[Client, Depends(get_service_client)],
):
    return AdminService(client).students()


@router.get("/projects")
async def projects(
    _: Annotated[CurrentUser, Depends(require_educator)],
    client: Annotated[Client, Depends(get_service_client)],
):
    return AdminService(client).projects()


@router.get("/usage")
async def usage(
    _: Annotated[CurrentUser, Depends(require_educator)],
    client: Annotated[Client, Depends(get_service_client)],
):
    return AdminService(client).usage_rows()

