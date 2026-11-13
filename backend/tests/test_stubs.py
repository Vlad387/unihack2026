from app.agents import critic, intake, mediate
from app.clustering import bridges, cluster
from app.schemas import Statement, Vote


def test_pipeline_runs_with_mocked_gemini() -> None:
    statements = intake("Barurile fac prea mult zgomot. Vrem autobuze de noapte.", None)
    assert len(statements) == 2

    votes = [
        Vote(
            participant_id=f"p{i}",
            statement_id=statement.id,
            value="agree" if (i < 10) == (j == 0) else "disagree",
        )
        for i in range(20)
        for j, statement in enumerate(statements)
    ]
    result = cluster(statements, votes)
    assert len(result.points) == 20
    assert len(result.camps) >= 2
    assert sum(c.size for c in result.camps) == 20

    common = bridges(votes, result.camps)
    proposal = mediate(result.camps, common, [], [])
    assert len(proposal.tradeoffs) == len(result.camps)
    assert critic(proposal, result.camps).balanced


def test_cluster_is_stable_between_calls() -> None:
    votes = [Vote(participant_id="p1", statement_id="s1", value="agree")]
    s = [Statement(id="s1", text="x")]
    assert cluster(s, votes) == cluster(s, votes)


def test_intake_empty_input() -> None:
    assert intake(None, None) == []
