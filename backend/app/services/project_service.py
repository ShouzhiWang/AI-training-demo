from uuid import UUID

from fastapi import HTTPException
from supabase import Client


class ProjectService:
    def __init__(self, client: Client):
        self.client = client

    def get_owned_project(self, project_id: UUID, user_id: UUID) -> dict:
        result = (
            self.client.table("projects")
            .select("*")
            .eq("id", str(project_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        return result.data

    def list_owned_projects(self, user_id: UUID) -> list[dict]:
        return (
            self.client.table("projects")
            .select("*")
            .eq("owner_id", str(user_id))
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )

    def get_files(self, project_id: UUID) -> list[dict]:
        return (
            self.client.table("project_files")
            .select("*")
            .eq("project_id", str(project_id))
            .order("path")
            .execute()
            .data
            or []
        )

    def apply_file_updates(
        self,
        project_id: UUID,
        user_id: UUID,
        title: str,
        updates: list[dict[str, str]],
    ) -> list[dict]:
        if not updates:
            return []
        return (
            self.client.rpc(
                "save_project_changes",
                {
                    "p_project_id": str(project_id),
                    "p_actor_id": str(user_id),
                    "p_changes": updates,
                    "p_title": title[:140],
                    "p_source": "agent",
                },
            )
            .execute()
            .data
            or []
        )
