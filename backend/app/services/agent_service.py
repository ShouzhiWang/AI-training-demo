from uuid import UUID

from supabase import Client

from app.agents.graph import build_agent_graph
from app.config import Settings
from app.models import AgentChatResponse, FileUpdate
from app.services.deepseek import DeepSeekService
from app.services.project_service import ProjectService
from app.services.usage_service import UsageService


class AgentService:
    def __init__(self, client: Client, settings: Settings):
        self.client = client
        self.projects = ProjectService(client)
        self.usage = UsageService(client)
        self.graph = build_agent_graph(DeepSeekService(settings), self.projects)

    async def chat(
        self,
        *,
        project_id: UUID,
        user_id: UUID,
        message: str,
        session_id: UUID | None,
    ) -> AgentChatResponse:
        project = self.projects.get_owned_project(project_id, user_id)
        files = self.projects.get_files(project_id)
        if session_id:
            session = (
                self.client.table("agent_sessions")
                .select("*")
                .eq("id", str(session_id))
                .eq("user_id", str(user_id))
                .maybe_single()
                .execute()
                .data
            )
            if not session:
                raise ValueError("Agent session not found")
        else:
            session = (
                self.client.table("agent_sessions")
                .insert(
                    {
                        "project_id": str(project_id),
                        "user_id": str(user_id),
                        "current_agent": "supervisor",
                    }
                )
                .execute()
                .data[0]
            )

        self.client.table("agent_messages").insert(
            {
                "session_id": session["id"],
                "role": "student",
                "content": message,
            }
        ).execute()

        state = await self.graph.ainvoke(
            {
                "project_id": project_id,
                "user_id": user_id,
                "message": message,
                "project": project,
                "files": files,
            }
        )
        agent = state["agent"]
        result = state["model_result"]
        self.client.table("agent_sessions").update(
            {"current_agent": agent, "status": "active"}
        ).eq("id", session["id"]).eq("user_id", str(user_id)).execute()
        self.client.table("agent_messages").insert(
            {
                "session_id": session["id"],
                "role": "assistant",
                "agent": agent,
                "content": state["response"],
                "suggestions": result.suggestions,
            }
        ).execute()
        self.usage.record(
            user_id=user_id,
            project_id=project_id,
            session_id=UUID(session["id"]),
            agent=agent,
            result=result,
        )
        return AgentChatResponse(
            session_id=session["id"],
            agent=agent,
            message=state["response"],
            suggestions=result.suggestions,
            file_updates=[
                FileUpdate(
                    path=item["path"],
                    content=item["content"],
                    version=item["version"],
                )
                for item in state.get("file_updates", [])
            ],
            model=result.model,
            fallback=result.fallback,
        )
