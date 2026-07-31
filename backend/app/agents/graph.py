from typing import Any, Literal, TypedDict
from uuid import UUID

from langgraph.graph import END, START, StateGraph

from app.agents.prompts import CODER_PROMPT, PLANNER_PROMPT, REVIEWER_PROMPT
from app.services.deepseek import DeepSeekService, ModelResult
from app.services.project_service import ProjectService


class AgentState(TypedDict, total=False):
    project_id: UUID
    user_id: UUID
    message: str
    project: dict[str, Any]
    files: list[dict[str, Any]]
    route: Literal["planner", "coder", "reviewer"]
    agent: Literal["planner", "coder", "reviewer"]
    response: str
    model_result: ModelResult
    file_updates: list[dict]


def route_message(message: str) -> Literal["planner", "coder", "reviewer"]:
    lowered = message.lower()
    if any(word in lowered for word in ("review", "suitable", "appropriate", "clarity")):
        return "reviewer"
    if any(
        word in lowered
        for word in ("change", "add", "remove", "button", "color", "code", "fix")
    ):
        return "coder"
    return "planner"


def build_agent_graph(deepseek: DeepSeekService, projects: ProjectService):
    async def supervisor(state: AgentState) -> AgentState:
        return {"route": route_message(state["message"])}

    async def planner(state: AgentState) -> AgentState:
        result = await deepseek.complete(PLANNER_PROMPT, state["message"])
        return {
            "agent": "planner",
            "response": result.content,
            "model_result": result,
            "file_updates": [],
        }

    async def coder(state: AgentState) -> AgentState:
        result, requested_updates = await deepseek.complete_coder(
            CODER_PROMPT, state["message"], state["files"]
        )
        saved = projects.apply_file_updates(
            state["project_id"],
            state["user_id"],
            state["message"],
            requested_updates,
        )
        return {
            "agent": "coder",
            "response": result.content,
            "model_result": result,
            "file_updates": saved,
        }

    async def reviewer(state: AgentState) -> AgentState:
        context = (
            f"Student request: {state['message']}\n"
            f"Project: {state['project'].get('name')}\n"
            f"Learning idea: {state['project'].get('description')}"
        )
        result = await deepseek.complete(REVIEWER_PROMPT, context)
        return {
            "agent": "reviewer",
            "response": result.content,
            "model_result": result,
            "file_updates": [],
        }

    builder = StateGraph(AgentState)
    builder.add_node("supervisor", supervisor)
    builder.add_node("planner", planner)
    builder.add_node("coder", coder)
    builder.add_node("reviewer", reviewer)
    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges(
        "supervisor",
        lambda state: state["route"],
        {"planner": "planner", "coder": "coder", "reviewer": "reviewer"},
    )
    builder.add_edge("planner", END)
    builder.add_edge("coder", END)
    builder.add_edge("reviewer", END)
    return builder.compile()
