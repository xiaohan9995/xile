import pytest

from backend.app import create_app


@pytest.fixture()
def client():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "ADMIN_DEV_TOKEN": "test-admin-token",
            "SEED_DEMO_DATA": True,
        }
    )

    return app.test_client()


def test_health_endpoint_reports_service_status(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "service": "xile-yoga-certification",
        "status": "ok",
    }


def test_mp_stats_overview_returns_counts(client):
    response = client.get("/api/mp/stats/overview")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["totalTeachers"] >= 2
    assert payload["totalStudios"] >= 2


def test_teacher_search_filters_by_name_and_hides_private_fields(client):
    response = client.get("/api/mp/teachers/search?q=张")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 1
    teacher = payload["items"][0]
    assert teacher["name"] == "张三"
    assert teacher["tier"] == "L3"
    assert teacher["certificationStatus"] == "认证有效"
    assert teacher["validUntil"] == "2028.12.31"
    assert teacher["certifiedAt"] == "2023.01.01"
    assert "phone" not in teacher
    assert "idCardNo" not in teacher


def test_teacher_detail_returns_public_certification_profile(client):
    response = client.get("/api/mp/teachers/1/summary")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["name"] == "张三"
    assert payload["teacherNo"] == "JY20230001"
    assert payload["specialties"] == ["阴瑜伽", "流瑜伽", "产后瑜伽"]
    assert payload["certifiedAt"] == "2023.01.01"
    assert payload["certificationNote"] == "该教师已通过喜乐瑜伽教师认证，资质处于有效期内。"
    assert "phone" not in payload


def test_studio_list_returns_open_studios_with_tags(client):
    response = client.get("/api/mp/studios")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] == 3
    studio = payload["items"][0]
    assert "tags" in studio
    assert isinstance(studio["tags"], list)
    assert len(studio["tags"]) > 0


def test_studio_detail_returns_public_profile(client):
    response = client.get("/api/mp/studios/1")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["name"] == "静心瑜伽空间"
    assert payload["ownerTeacherName"] == "张三"
    assert isinstance(payload["tags"], list)


def test_mp_review_submission_creates_admin_visible_review_with_files(client):
    response = client.post(
        "/api/mp/reviews",
        json={
            "teacherId": 1,
            "reviewYear": 2027,
            "files": [
                {
                    "title": "professional portrait",
                    "fileName": "portrait.jpg",
                    "fileType": "image/jpeg",
                    "fileSize": 12345,
                }
            ],
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["teacherId"] == 1
    assert payload["reviewYear"] == 2027
    assert payload["status"] == "submitted"
    assert payload["files"][0]["filename"] == "portrait.jpg"

    admin_response = client.get(
        "/api/admin/reviews?status=submitted",
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert admin_response.status_code == 200
    admin_payload = admin_response.get_json()
    created_review = next(item for item in admin_payload["items"] if item["id"] == payload["id"])
    assert created_review["teacherId"] == 1
    assert created_review["files"][0]["filename"] == "portrait.jpg"


def test_mp_review_submission_validates_teacher_and_files(client):
    missing_files_response = client.post(
        "/api/mp/reviews",
        json={"teacherId": 1, "reviewYear": 2027, "files": []},
    )
    assert missing_files_response.status_code == 400

    missing_teacher_response = client.post(
        "/api/mp/reviews",
        json={"teacherId": 999, "reviewYear": 2027, "files": [{"fileName": "portrait.jpg"}]},
    )
    assert missing_teacher_response.status_code == 404


def test_mp_teacher_certification_returns_self_service_profile_and_reviews(client):
    response = client.get("/api/mp/teachers/2/certification")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["teacher"]["id"] == 2
    assert payload["teacher"]["teacherNo"] == "JY20230002"
    assert payload["teacher"]["daysLeft"] >= 0
    assert payload["teacher"]["reviewCycleYears"] == 2
    assert payload["reviews"][0]["reviewYear"] == 2026
    assert payload["reviews"][0]["status"] == "submitted"
    assert payload["reviews"][0]["files"][0]["filename"].endswith(".pdf")


def test_mp_auth_login_dev_mode(client):
    response = client.post(
        "/api/mp/auth/login",
        json={"code": "dev-mock-code-1"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["teacherId"] == 1
    assert payload["role"] == "teacher"
    assert "token" in payload


def test_admin_dashboard_requires_bearer_token(client):
    response = client.get("/api/admin/stats/dashboard")

    assert response.status_code == 401
    assert response.get_json()["error"] == "unauthorized"


def test_admin_login_returns_dev_token(client):
    response = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": "password"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["token"] == "test-admin-token"
    assert payload["admin"]["name"] == "系统管理员"


def test_admin_dashboard_returns_seeded_counts(client):
    response = client.get(
        "/api/admin/stats/dashboard",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["teacherCount"] >= 4
    assert payload["activeTeacherCount"] >= 3
    assert payload["pendingReviewCount"] == 1
    assert payload["openStudioCount"] >= 2
    assert "expiringCount" in payload
    assert "completedReviewCount" in payload


def test_admin_teacher_list_returns_private_roster(client):
    response = client.get(
        "/api/admin/teachers",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] >= 4
    teacher = next(t for t in payload["items"] if t["teacherNo"] == "JY20230001")
    assert teacher["name"] == "张三"
    assert teacher["phone"] == "13800000000"
    assert teacher["tier"] == "L3"
    assert teacher["certifiedAt"] == "2023.01.01"


def test_admin_create_teacher(client):
    response = client.post(
        "/api/admin/teachers",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"name": "测试教师", "level": "L2", "phone": "13512345678", "city": "深圳市"},
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["name"] == "测试教师"
    assert payload["tier"] == "L2"
    assert payload["teacherNo"].startswith("JY2026")


def test_admin_delete_teacher(client):
    response = client.delete(
        "/api/admin/teachers/1",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "hidden"

    search = client.get("/api/mp/teachers/search?q=张")
    assert search.get_json()["total"] == 0


def test_admin_studio_list_returns_all_studios_for_management(client):
    response = client.get(
        "/api/admin/studios",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] >= 3
    assert {studio["status"] for studio in payload["items"]} == {"open", "hidden"}
    assert isinstance(payload["items"][0]["tags"], list)


def test_admin_create_studio(client):
    response = client.post(
        "/api/admin/studios",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"name": "新馆测试", "city": "成都市", "contact": "028-88888888", "tags": "冥想, 素食"},
    )

    assert response.status_code == 201
    assert response.get_json()["name"] == "新馆测试"


def test_admin_delete_studio(client):
    response = client.delete(
        "/api/admin/studios/1",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "hidden"


def test_admin_review_queue_returns_reviews_with_avatar(client):
    response = client.get(
        "/api/admin/reviews",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] >= 1
    review = payload["items"][0]
    assert review["teacherName"] == "李四"
    assert "avatarUrl" in review
    assert review["status"] == "submitted"


def test_admin_review_decision_approves_and_updates_valid_until(client):
    response = client.post(
        "/api/admin/reviews/1/decision",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"status": "approved", "comment": "材料完整，准予通过"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["status"] == "approved"
    assert payload["reviewerComment"] == "材料完整，准予通过"

    cert = client.get("/api/mp/teachers/2/certification")
    teacher = cert.get_json()["teacher"]
    assert teacher["validUntil"] == "2028.06.30"


def test_admin_review_decision_rejects_invalid_status(client):
    response = client.post(
        "/api/admin/reviews/1/decision",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"status": "archived"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid status"


def test_admin_analytics(client):
    response = client.get(
        "/api/admin/analytics",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert "tierDistribution" in payload
    assert "cityDistribution" in payload
    assert "monthlyTrend" in payload
    assert len(payload["monthlyTrend"]) == 12


def test_admin_settings_get_and_update(client):
    response = client.get(
        "/api/admin/settings",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["tiers"]) >= 6
    assert payload["features"]["qrVerifyEnabled"] is True

    update = client.put(
        "/api/admin/settings",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"features": {"qrVerifyEnabled": False}},
    )
    assert update.status_code == 200

    after = client.get(
        "/api/admin/settings",
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert after.get_json()["features"]["qrVerifyEnabled"] is False


def test_admin_permissions_list(client):
    response = client.get(
        "/api/admin/permissions",
        headers={"Authorization": "Bearer test-admin-token"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] >= 1
    assert payload["items"][0]["username"] == "admin"
