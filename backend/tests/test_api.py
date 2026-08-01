from fastapi.testclient import TestClient

from app.main import app, settings


def test_health_reports_safe_fallbacks():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    expected_model = (
        settings.deepseek_model
        if settings.deepseek_api_key
        else "muse-development-mentor"
    )
    assert response.json()["model"] == expected_model


def test_openapi_contains_required_phase_four_and_five_routes():
    schema = TestClient(app).get("/openapi.json").json()
    expected = {
        "/me",
        "/projects",
        "/projects/{project_id}",
        "/agent/chat",
        "/agent/session/{session_id}",
        "/admin/stats",
        "/admin/students",
        "/admin/projects",
        "/admin/usage",
    }
    assert expected.issubset(schema["paths"])
