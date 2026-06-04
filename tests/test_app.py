from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Arrange: reset in-memory activities before each test to ensure isolation."""
    original = deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original)


def test_get_activities_returns_mapping():
    # Arrange
    # Act
    resp = client.get("/activities")
    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_success():
    # Arrange
    activity = "Chess Club"
    email = "testuser@example.com"

    # Act
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")

    # Assert
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]


def test_signup_duplicate_returns_400():
    # Arrange
    activity = "Chess Club"
    existing = app_module.activities[activity]["participants"][0]

    # Act
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(existing)}")

    # Assert
    assert resp.status_code == 400


def test_remove_participant_removes():
    # Arrange
    activity = "Chess Club"
    email = "tempuser@example.com"
    if email in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].remove(email)
    app_module.activities[activity]["participants"].append(email)

    # Act
    resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")

    # Assert
    assert resp.status_code == 200
    assert email not in app_module.activities[activity]["participants"]


def test_remove_nonexistent_returns_404():
    # Arrange
    activity = "Chess Club"
    email = "doesnotexist@example.com"
    if email in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].remove(email)

    # Act
    resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")

    # Assert
    assert resp.status_code == 404
