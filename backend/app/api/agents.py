from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_service_client
from app.models import AgentChatRequest, AgentChatResponse, CurrentUser
from app.services.agent_service import AgentService


router = APIRouter(prefix="/agent", tags=["agents"])


@router.post("/chat", response_model=AgentChatResponse)
async def chat(
    request: AgentChatRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[Client, Depends(get_service_client)],
    settings: Annotated[Settings, Depends(get_settings)],
):
    try:
        return await AgentService(client, settings).chat(
            project_id=request.project_id,
            user_id=user.id,
            message=request.message,
            session_id=request.session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/session/{session_id}")
async def session(
    session_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    client: Annotated[Client, Depends(get_service_client)],
):
    row = (
        client.table("agent_sessions")
        .select("*")
        .eq("id", str(session_id))
        .eq("user_id", str(user.id))
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = (
        client.table("agent_messages")
        .select("*")
        .eq("session_id", str(session_id))
        .order("created_at")
        .execute()
        .data
        or []
    )
    return {**row, "messages": messages}

