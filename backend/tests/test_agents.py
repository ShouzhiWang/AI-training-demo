import pytest

from app.agents.graph import route_message
from app.config import Settings
from app.services.deepseek import DeepSeekService


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("I have an idea for a fractions game", "planner"),
        ("Change the button color", "coder"),
        ("Is this suitable for younger children?", "reviewer"),
    ],
)
def test_supervisor_routes_student_intent(message, expected):
    assert route_message(message) == expected


@pytest.mark.asyncio
async def test_development_fallback_is_educational():
    service = DeepSeekService(Settings(deepseek_api_key=""))
    result = await service.complete("mentor", "help")
    assert result.fallback is True
    assert "learning goal" in result.content
    assert result.model == "muse-development-mentor"
    assert len(result.suggestions) == 3
