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
        self, project_id: UUID, updates: list[dict[str, str]]
    ) -> list[dict]:
        saved: list[dict] = []
        for update in updates:
            existing = (
                self.client.table("project_files")
                .select("id,version")
                .eq("project_id", str(project_id))
                .eq("path", update["path"])
                .maybe_single()
                .execute()
                .data
            )
            if not existing:
                continue
            result = (
                self.client.table("project_files")
                .update(
                    {
                        "content": update["content"],
                        "version": existing["version"] + 1,
                    }
                )
                .eq("id", existing["id"])
                .eq("project_id", str(project_id))
                .execute()
            )
            if result.data:
                saved.append(result.data[0])
        return saved

