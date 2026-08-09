from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import main
from api.dependencies import get_supabase


@pytest.fixture
def client_and_supabase():
    supabase = MagicMock()
    main.app.dependency_overrides[get_supabase] = lambda: supabase
    yield TestClient(main.app), supabase
    main.app.dependency_overrides.clear()


def test_search_users_returns_limited_public_profile(client_and_supabase):
    client, supabase = client_and_supabase
    table = supabase.table.return_value
    table.select.return_value.ilike.return_value.limit.return_value.execute.return_value = SimpleNamespace(data=[{
        "user_id": "user-1", "email": "friend@example.com", "display_name": "Friend", "avatar_url": None,
    }])

    response = client.get("/users/search", params={"email": "fri"})

    assert response.status_code == 200
    assert response.json()["users"] == [{
        "id": "user-1", "email": "friend@example.com", "name": "Friend", "avatar": None,
    }]
    table.select.return_value.ilike.assert_called_once_with("email", "fri%")


def test_search_users_requires_three_characters(client_and_supabase):
    client, supabase = client_and_supabase
    response = client.get("/users/search", params={"email": "fr"})
    assert response.status_code == 422
    supabase.table.assert_not_called()
