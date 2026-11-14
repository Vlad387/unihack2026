"""Score assist on Eidrien's test conversations (one Gemini call each): numbers for the pitch.

uv run python -m app.agents.eval_assist                 # all of seed/chat_eval.json
uv run python -m app.agents.eval_assist 10              # only the first 10 (saves quota)

Each item: {"id", "page", "messages": [{"role", "text"}], "expected_action",
"expected_report_kind" (only for reports)}. Schema documented in seed/README.md.
"""

import json
import statistics
import sys
import time
from pathlib import Path

from pydantic import BaseModel

from app.agents import AgentError, assist
from app.schemas import ChatContext, ChatMessage, ChatReply

EVAL = Path(__file__).resolve().parents[3] / "seed" / "chat_eval.json"
QUESTION = "Ce facem cu viața de noapte din centru?"


class EvalItem(BaseModel):
    id: str
    page: str = "/participa"
    messages: list[ChatMessage]
    expected_action: str
    expected_report_kind: str | None = None


def is_correct(item: EvalItem, reply: ChatReply) -> bool:
    if reply.action.type != item.expected_action:
        return False
    if item.expected_report_kind is None:
        return True
    return reply.report is not None and reply.report.kind == item.expected_report_kind


def main() -> None:
    items = [EvalItem(**raw) for raw in json.loads(EVAL.read_text(encoding="utf-8"))]
    if len(sys.argv) > 1:
        items = items[: int(sys.argv[1])]

    correct, failed, latencies = 0, 0, []
    for item in items:
        context = ChatContext(question=QUESTION, page=item.page, round=1)
        start = time.perf_counter()
        try:
            reply = assist(item.messages, context)
        except AgentError as e:
            failed += 1
            print(f"✗ {item.id}: Gemini failed ({e})")
            continue
        latencies.append((time.perf_counter() - start) * 1000)
        if is_correct(item, reply):
            correct += 1
        else:
            got = reply.action.type + (f"/{reply.report.kind}" if reply.report else "")
            print(f"✗ {item.id}: expected {item.expected_action}, got {got}")

    answered = len(items) - failed
    print(f"\n{correct}/{answered} correct actions ({correct / max(answered, 1):.0%})")
    if failed:
        print(f"{failed} Gemini failures (quota?)")
    if latencies:
        print(f"median latency {statistics.median(latencies):.0f} ms")


if __name__ == "__main__":
    main()
