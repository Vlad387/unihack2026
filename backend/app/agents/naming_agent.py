"""Camp naming agent: placeholder camps ("Tabăra 1") -> short human names + descriptions."""

import json
import logging

from pydantic import BaseModel

from app.agents.gemini import NAMING_MODEL, generate, load_prompt
from app.agents.mediate_agent import camp_arguments
from app.schemas import Camp

log = logging.getLogger(__name__)


class _Label(BaseModel):
    camp_id: str
    name: str
    description: str


class _NamingOutput(BaseModel):
    camps: list[_Label]


def name_camps(camps: list[Camp], taken_names: list[str] | None = None) -> list[Camp]:
    """Return the same camps (same ids, members, order) with Gemini-written names.

    One Gemini call for all given camps, so call it only for NEW camps (the API keeps
    names of camps that survive a re-cluster). A camp with no written arguments, or one
    Gemini skipped or named twice, keeps its current name. Raises AgentError if Gemini
    fails: the caller keeps the placeholder names and may retry later.
    """
    with_args = [c for c in camps if camp_arguments(c)]
    if not with_args:
        return camps

    payload = {
        "camps": [
            {"id": c.id, "size": c.size, "arguments": camp_arguments(c)}
            for c in with_args
        ],
        "taken_names": list(taken_names or []),
    }
    output = generate(
        NAMING_MODEL,
        load_prompt("naming"),
        [json.dumps(payload, ensure_ascii=False, indent=1)],
        _NamingOutput,
        thinking="low",
    )

    labels = {label.camp_id: label for label in output.camps}
    used = {n.casefold() for n in taken_names or []}
    named: list[Camp] = []
    for camp in camps:
        label = labels.get(camp.id)
        name = label.name.strip() if label else ""
        # a duplicate name would make two camps look like one on the map
        if not name or name.casefold() in used:
            if camp in with_args:
                log.warning("naming skipped camp %s (missing or duplicate)", camp.id)
            named.append(camp)
            continue
        used.add(name.casefold())
        named.append(
            camp.model_copy(
                update={"name": name, "description": label.description.strip()}
            )
        )
    return named
