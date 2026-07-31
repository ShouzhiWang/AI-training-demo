from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_current_user, get_service_client
from app.models import CurrentUser
from app.services.project_service import ProjectService


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def list_projects(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[Client, Depends(get_service_client)],
):
    return ProjectService(client).list_owned_projects(user.id)


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[Client, Depends(get_service_client)],
):
    service = ProjectService(client)
    return {
        "project": service.get_owned_project(project_id, user.id),
        "files": service.get_files(project_id),
    }

