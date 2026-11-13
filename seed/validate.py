"""Validate the synthetic demo dataset without backend dependencies."""

import json
from collections import Counter
from pathlib import Path


def main() -> None:
    responses = json.loads(
        Path(__file__).with_name("responses.json").read_text(encoding="utf-8")
    )
    assert isinstance(responses, list) and 40 <= len(responses) <= 60
    assert all(isinstance(row, dict) for row in responses)
    assert all(set(row) == {"id", "group", "text"} for row in responses)
    assert all(
        isinstance(value, str) and value.strip()
        for row in responses
        for value in row.values()
    )
    assert len({row["id"] for row in responses}) == len(responses)
    assert len({row["text"].casefold().strip() for row in responses}) == len(responses)
    groups = Counter(row["group"] for row in responses)
    assert set(groups) == {"resident", "bar_owner", "student", "elderly", "tourist"}
    assert all(count >= 5 for count in groups.values())
    print(f"Validated {len(responses)} unique synthetic responses: {dict(groups)}")
    for group in groups:
        example = next(row["text"] for row in responses if row["group"] == group)
        print(f"{group}: {example}")


if __name__ == "__main__":
    main()
