from app.agents import critic, intake, mediate
from app.clustering import bridges, cluster
from app.schemas import Statement, Vote


def test_pipeline_runs_end_to_end_on_stubs() -> None:
    statements = intake("Barurile fac prea mult zgomot. Vrem autobuze de noapte.", None)
    assert len(statements) == 2

    votes = [
        Vote(participant_id=f"p{i}", statement_id=statements[0].id, value="agree")
        for i in range(10)
    ]
    result = cluster(statements, votes)
    assert len(result.points) == 10
    assert sum(c.size for c in result.camps) == 10

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
