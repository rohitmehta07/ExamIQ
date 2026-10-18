import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_demo_student():
    response = client.post("/api/auth/login", json={
        "email": "demo@examiq.edu",
        "password": "DemoStudent123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "STUDENT"
    assert data["email"] == "demo@examiq.edu"

def test_login_admin():
    response = client.post("/api/auth/login", json={
        "email": "admin@examiq.edu",
        "password": "AdminPass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_login_invalid():
    response = client.post("/api/auth/login", json={
        "email": "demo@examiq.edu",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

def test_student_profile_privacy():
    # Login as student
    login_res = client.post("/api/auth/login", json={
        "email": "demo@examiq.edu",
        "password": "DemoStudent123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile
    prof_res = client.get("/api/student/profile", headers=headers)
    assert prof_res.status_code == 200
    pdata = prof_res.json()
    assert pdata["target_marks"] == 85.0
    assert "weak_topics" in pdata

def test_new_student_registration_has_fresh_isolated_data():
    import time
    fresh_email = f"fresh_student_{int(time.time() * 1000)}@examiq.edu"
    fresh_name = "Fresh Student John"

    # 1. Register fresh student
    reg_res = client.post("/api/auth/register", json={
        "email": fresh_email,
        "password": "SecurePassword123!",
        "full_name": fresh_name,
        "role": "STUDENT"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["full_name"] == fresh_name
    assert reg_data["email"] == fresh_email

    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify fresh profile has 0 previous marks and 0 readiness
    prof_res = client.get("/api/student/profile", headers=headers)
    assert prof_res.status_code == 200
    profile = prof_res.json()
    assert profile["overall_readiness"] == 0.0
    assert profile["previous_marks"] == 0.0
    assert profile["completed_topics"] == []
    assert profile["weak_topics"] == []
    assert profile["strong_topics"] == []

    # 3. Verify fresh student has no dummy performances
    perf_res = client.get("/api/student/performance", headers=headers)
    assert perf_res.status_code == 200
    assert perf_res.json() == []

    # 4. Verify fresh student has no study plan before generating one
    plan_res = client.get("/api/study-plan", headers=headers)
    assert plan_res.status_code == 200
    assert plan_res.json() is None

