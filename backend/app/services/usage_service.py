from uuid import UUID

from supabase import Client

from app.services.deepseek import ModelResult


class UsageService:
    def __init__(self, client: Client):
        self.client = client

    def record(
        self,
        *,
        user_id: UUID,
        project_id: UUID,
        session_id: UUID,
        agent: str,
        result: ModelResult,
    ) -> None:
        self.client.table("ai_usage").insert(
            {
                "user_id": str(user_id),
                "project_id": str(project_id),
                "session_id": str(session_id),
                "agent": agent,
                "model": result.model,
                "input_tokens": result.input_tokens,
                "output_tokens": result.output_tokens,
                "cost": 0,
            }
        ).execute()

