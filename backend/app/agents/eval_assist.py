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
from app.agents.gemini import ASSIST_MODEL, FALLBACK_MODEL
from app.schemas import ChatContext, ChatMessage, ChatReply

EVAL = Path(__file__).resolve().parents[3] / "seed" / "chat_eval.json"
QUESTION = "Ce facem cu viața de noapte din centru?"
PROPOSAL = "Terasele închid la 23, interiorul la 02 în weekend, autobuz de noapte."
PAUSE_S = 4.5


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

    # scoring rules: seed/CHAT_EVAL_NUMBERS.md (failures count as wrong, traps reviewed by hand)
    print(f"model {ASSIST_MODEL} (fallback {FALLBACK_MODEL}), {len(items)} cases\n")
    actions_ok, kinds_ok, reports, failed, latencies = 0, 0, 0, 0, []
    for item in items:
        # like the real API during a round: a round always comes with its proposal text
        context = ChatContext(
            question=QUESTION, page=item.page, round=1, proposal_text=PROPOSAL
        )
        # shortcut: free tier allows 15 requests/min per model, drop it with billing on
        time.sleep(PAUSE_S)
        reports += item.expected_report_kind is not None
        start = time.perf_counter()
        try:
            reply = assist(item.messages, context)
        except AgentError as e:
            failed += 1
            print(f"✗ {item.id}: Gemini failed ({e})")
            continue
        latencies.append((time.perf_counter() - start) * 1000)
        action_ok = reply.action.type == item.expected_action
        actions_ok += action_ok
        kinds_ok += item.expected_report_kind is not None and is_correct(item, reply)
        got = reply.action.type + (f"/{reply.report.kind}" if reply.report else "")
        if not action_ok:
            print(f"✗ {item.id}: expected {item.expected_action}, got {got}")
        # traps and drafts need a human read, not just the action label
        if item.id.startswith("chat-trap") or reply.action.prefill or reply.report:
            print(f"· {item.id} [{got}] {reply.text}")
            if reply.action.prefill:
                print(f"    ciornă: {reply.action.prefill}")
            if reply.report:
                print(f"    raport: {reply.report.text}")

    print(f"\naction accuracy {actions_ok}/{len(items)}")
    print(f"report-kind accuracy {kinds_ok}/{reports}")
    print(f"{len(items) - failed} completed, {failed} failed")
    if latencies:
        print(f"median latency {statistics.median(latencies) / 1000:.1f} s")


if __name__ == "__main__":
    main()
