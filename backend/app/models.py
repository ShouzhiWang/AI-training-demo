from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


AgentName = Literal["supervisor", "planner", "coder", "reviewer"]


class CurrentUser(BaseModel):
    id: UUID
    email: str
    name: str
    role: Literal["student", "teacher", "admin"]
    token: str = Field(exclude=True)


class AgentChatRequest(BaseModel):
    project_id: UUID
    message: str = Field(min_length=1, max_length=4000)
    session_id: UUID | None = None


class FileUpdate(BaseModel):
    path: str
    content: str
    version: int


class AgentChatResponse(BaseModel):
    session_id: UUID
    agent: AgentName
    message: str
    suggestions: list[str] = Field(default_factory=list)
    file_updates: list[FileUpdate] = Field(default_factory=list)
    model: str
    fallback: bool = False


class AgentSessionResponse(BaseModel):
    id: UUID
    project_id: UUID
    current_agent: AgentName
    status: str
    messages: list[dict[str, Any]]


class AdminStats(BaseModel):
    total_students: int
    active_projects: int
    ai_requests: int
    completed_projects: int
