from collections import Counter

from supabase import Client


class AdminService:
    def __init__(self, client: Client):
        self.client = client

    def stats(self) -> dict:
        students = (
            self.client.table("user_profiles").select("id").eq("role", "student").execute().data
            or []
        )
        projects = self.client.table("projects").select("id,status").execute().data or []
        usage = self.client.table("ai_usage").select("id").execute().data or []
        return {
            "total_students": len(students),
            "active_projects": sum(item["status"] == "active" for item in projects),
            "ai_requests": len(usage),
            "completed_projects": sum(
                item["status"] == "completed" for item in projects
            ),
        }

    def students(self) -> list[dict]:
        profiles = (
            self.client.table("user_profiles")
            .select("id,email,name,role,created_at")
            .eq("role", "student")
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
        projects = self.client.table("projects").select("owner_id,progress,updated_at").execute().data or []
        usage = self.client.table("ai_usage").select("user_id").execute().data or []
        project_counts = Counter(item["owner_id"] for item in projects)
        usage_counts = Counter(item["user_id"] for item in usage)
        latest = {}
        progress = {}
        for item in projects:
            owner = item["owner_id"]
            latest[owner] = max(latest.get(owner, ""), item["updated_at"])
            progress.setdefault(owner, []).append(item["progress"])
        return [
            {
                **profile,
                "projects": project_counts[profile["id"]],
                "ai_usage": usage_counts[profile["id"]],
                "last_activity": latest.get(profile["id"]),
                "progress": round(sum(progress.get(profile["id"], [0])) / len(progress.get(profile["id"], [0]))),
            }
            for profile in profiles
        ]

    def projects(self) -> list[dict]:
        return (
            self.client.table("projects")
            .select(
                "id,name,status,progress,updated_at,owner_id,"
                "user_profiles:user_profiles!projects_owner_id_fkey(name,email)"
            )
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )

    def usage_rows(self) -> list[dict]:
        return (
            self.client.table("ai_usage")
            .select("id,user_id,project_id,agent,model,input_tokens,output_tokens,cost,created_at")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
            .data
            or []
        )
