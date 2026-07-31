from uuid import UUID

from app.services.project_service import ProjectService


class FileTools:
    def __init__(self, projects: ProjectService, project_id: UUID):
        self.projects = projects
        self.project_id = project_id

    def list_files(self) -> list[str]:
        return [item["path"] for item in self.projects.get_files(self.project_id)]

    def read_file(self, path: str) -> str:
        for item in self.projects.get_files(self.project_id):
            if item["path"] == path:
                return item["content"]
        raise ValueError(f"File not found: {path}")

    def write_files(self, updates: list[dict[str, str]]) -> list[dict]:
        return self.projects.apply_file_updates(self.project_id, updates)

