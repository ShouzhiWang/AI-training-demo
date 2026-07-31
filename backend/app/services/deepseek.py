import json
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.config import Settings


@dataclass
class ModelResult:
    content: str
    model: str
    suggestions: list[str] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    fallback: bool = False


class DeepSeekService:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def complete(self, system: str, user: str) -> ModelResult:
        if not self.settings.deepseek_api_key:
            return ModelResult(
                content=(
                    "Let’s make this change with a clear learning goal first. "
                    "Describe who the learner is, what they should practice, and "
                    "what helpful feedback they should see."
                ),
                model="muse-development-mentor",
                suggestions=[
                    "Help me choose a learning goal",
                    "Ask me one question at a time",
                    "I’ll describe my own goal",
                ],
                fallback=True,
            )

        response_instruction = (
            f"{user}\n\nReturn JSON only with this shape: "
            '{"message":"concise Markdown response","suggestions":'
            '["2–3 short replies the student could choose next"]}. '
            "Suggestions must be specific to the conversation, under 100 characters, "
            "and written in the student's voice."
        )
        payload = {
            "model": self.settings.deepseek_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": response_instruction},
            ],
            "thinking": {"type": "disabled"},
            "response_format": {"type": "json_object"},
            "max_tokens": 900,
            "temperature": 0.4,
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{self.settings.deepseek_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.deepseek_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        raw_content = data["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            parsed = {"message": raw_content, "suggestions": []}
        message = parsed.get("message")
        if not isinstance(message, str) or not message.strip():
            message = raw_content
        usage = data.get("usage") or {}
        return ModelResult(
            content=message,
            model=data.get("model", self.settings.deepseek_model),
            suggestions=_clean_suggestions(parsed.get("suggestions")),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
        )

    async def complete_coder(
        self, system: str, user: str, files: list[dict[str, Any]]
    ) -> tuple[ModelResult, list[dict[str, str]]]:
        if not self.settings.deepseek_api_key:
            result = await self.complete(system, user)
            return result, []

        file_context = "\n\n".join(
            f"--- {item['path']} ---\n{item['content']}" for item in files
        )
        json_instruction = (
            f"{user}\n\nCurrent files:\n{file_context}\n\n"
            'Return JSON only: {"message":"student-friendly explanation",'
            '"updates":[{"path":"existing filename","content":"complete replacement"}],'
            '"suggestions":["2–3 short replies the student could choose next"]}. '
            "Change only files needed for the request. Suggestions must be specific, "
            "under 100 characters, and written in the student's voice."
        )
        payload = {
            "model": self.settings.deepseek_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": json_instruction},
            ],
            "thinking": {"type": "disabled"},
            "response_format": {"type": "json_object"},
            "max_tokens": 4000,
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        parsed = json.loads(data["choices"][0]["message"]["content"])
        allowed_paths = {item["path"] for item in files}
        updates = [
            item
            for item in parsed.get("updates", [])
            if item.get("path") in allowed_paths
            and isinstance(item.get("content"), str)
            and len(item["content"].encode()) <= 1_048_576
        ]
        usage = data.get("usage") or {}
        message = parsed.get("message")
        if not isinstance(message, str) or not message.strip():
            message = "I updated the project files."
        result = ModelResult(
            content=message,
            model=data.get("model", self.settings.deepseek_model),
            suggestions=_clean_suggestions(parsed.get("suggestions")),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
        )
        return result, updates


def _clean_suggestions(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    suggestions: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        suggestion = " ".join(item.split()).strip()
        if suggestion and len(suggestion) <= 100 and suggestion not in suggestions:
            suggestions.append(suggestion)
        if len(suggestions) == 3:
            break
    return suggestions
