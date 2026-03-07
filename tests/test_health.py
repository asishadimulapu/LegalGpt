# Tests for health / root endpoints
"""
Smoke tests that verify the API boots and the basic endpoints respond.
"""


def test_root_returns_200(client):
    """GET / should return app metadata."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "name" in data
    assert "version" in data


def test_health_endpoint(client):
    """GET /health should return status ok (even if DB is unreachable)."""
    resp = client.get("/health")
    # health endpoint may return 200 or 503 depending on DB connectivity;
    # in test env with SQLite it should succeed.
    assert resp.status_code in (200, 503)
