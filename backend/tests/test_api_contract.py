import hashlib
import hmac
import time
from io import BytesIO

import pytest

from backend.app import create_app
from backend.app.extensions import db
from backend.app.models import AdminUser, SystemConfig, Teacher, TeacherTier, User
from backend.app.seed import ensure_initial_admin, ensure_system_defaults, reset_admin_password
from backend.app.services.auth_service import AuthError, wx_login


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
    payload = response.get_json()
    assert payload["service"] == "xile-yoga-certification"
    assert payload["status"] == "ok"
    assert payload["db"] == "ok"


def test_production_reference_data_initialization_is_idempotent():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "ADMIN_DEV_TOKEN": "test-admin-token",
        }
    )
    with app.app_context():
        db.create_all()
        ensure_system_defaults()
        assert TeacherTier.query.count() == 6
        assert SystemConfig.query.count() == 2

        l1 = TeacherTier.query.filter_by(code="L1").first()
        l1.review_cycle_years = 4
        db.session.commit()
        ensure_system_defaults()

        assert TeacherTier.query.count() == 6
        assert TeacherTier.query.filter_by(code="L1").first().review_cycle_years == 4


def test_initial_admin_is_created_once_without_overwriting_an_existing_admin():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "ADMIN_DEV_TOKEN": "test-admin-token",
        }
    )
    with app.app_context():
        db.create_all()
        ensure_initial_admin("xile_admin", "a-secure-initial-password")

        admin = AdminUser.query.one()
        assert admin.username == "xile_admin"
        assert admin.role == "super_admin"

        ensure_initial_admin("another_admin", "another-secure-password")
        assert AdminUser.query.count() == 1

        reset_admin_password("xile_admin", "a-new-secure-admin-password")
        client = app.test_client()
        response = client.post(
            "/api/admin/login",
            json={"username": "xile_admin", "password": "a-new-secure-admin-password"},
        )
        assert response.status_code == 200

        with pytest.raises(RuntimeError, match="does not exist"):
            reset_admin_password("missing_admin", "another-secure-password")


def test_wechat_login_requires_credentials_outside_development(monkeypatch):
    monkeypatch.delenv("WECHAT_APPID", raising=False)
    monkeypatch.delenv("WECHAT_SECRET", raising=False)
    app = create_app(
        {
            "TESTING": False,
            "DEBUG": False,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "x" * 32,
        }
    )
    with app.app_context(), pytest.raises(AuthError, match="微信登录尚未配置"):
        wx_login("real-wechat-login-code")


def test_cloudbase_auth_bridge_exchanges_verified_identity_for_app_session(client, monkeypatch):
    secret = "cloudbase-bridge-test-secret-at-least-32-bytes"
    timestamp = int(time.time())
    nonce = "a" * 32
    monkeypatch.setenv("WECHAT_APPID", "wxf34d7e608bc79d85")
    client.application.config["CLOUDBASE_AUTH_BRIDGE_SECRET"] = secret
    message = f"cloudbase-openid-1\nwxf34d7e608bc79d85\n{timestamp}\n{nonce}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    response = client.post(
        "/api/mp/auth/cloudbase-login",
        json={
            "assertion": {
                "openid": "cloudbase-openid-1",
                "appid": "wxf34d7e608bc79d85",
                "timestamp": timestamp,
                "nonce": nonce,
                "signature": signature,
            }
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["token"]
    assert payload["phoneBound"] is False


def test_cloudbase_auth_bridge_rejects_tampered_identity(client, monkeypatch):
    monkeypatch.setenv("WECHAT_APPID", "wxf34d7e608bc79d85")
    client.application.config["CLOUDBASE_AUTH_BRIDGE_SECRET"] = "cloudbase-bridge-test-secret-at-least-32-bytes"

    response = client.post(
        "/api/mp/auth/cloudbase-login",
        json={
            "assertion": {
                "openid": "cloudbase-openid-1",
                "appid": "wxf34d7e608bc79d85",
                "timestamp": int(time.time()),
                "nonce": "a" * 32,
                "signature": "not-a-valid-signature",
            }
        },
    )

    assert response.status_code == 401


def test_teacher_can_link_wechat_session_with_an_admin_generated_code(client):
    admin_headers = {"Authorization": "Bearer test-admin-token"}
    create_code = client.post("/api/admin/teachers/1/link-code", headers=admin_headers)
    assert create_code.status_code == 201
    code = create_code.get_json()["code"]

    wechat_login = client.post("/api/mp/auth/login", json={"code": "a-new-wechat-user"})
    assert wechat_login.status_code == 200
    wechat_user_id = wechat_login.get_json()["userId"]
    token = wechat_login.get_json()["token"]

    linked = client.post(
        "/api/mp/auth/link-teacher",
        json={"code": code},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert linked.status_code == 200
    payload = linked.get_json()
    assert payload["teacherId"] == 1
    assert payload["role"] == "teacher"
    assert payload["token"]
    me = client.get("/api/mp/auth/me", headers={"Authorization": f"Bearer {payload['token']}"})
    assert me.status_code == 200
    assert me.get_json()["userId"] == wechat_user_id
    assert me.get_json()["teacherId"] == 1

    reused = client.post(
        "/api/mp/auth/link-teacher",
        json={"code": code},
        headers={"Authorization": f"Bearer {payload['token']}"},
    )
    assert reused.status_code == 410


def test_mp_stats_overview_returns_counts(client):
    response = client.get("/api/mp/stats/overview")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["totalTeachers"] >= 2
    assert payload["totalStudios"] >= 2


def test_mp_homepage_returns_public_content(client):
    response = client.get("/api/mp/homepage")

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload["announcements"], list)
    assert isinstance(payload["featuredTeachers"], list)


def test_featured_teachers_show_up_to_ten_and_sort_by_tier_desc(client):
    response = client.get("/api/mp/teachers/featured?page=1&pageSize=10")

    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["items"]) <= 10
    assert payload["page"] == 1
    assert payload["pageSize"] == 10
    assert [item["tier"] for item in payload["items"]] == ["L5", "L4", "L3", "L2"]
    assert "hasMore" in payload


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


def test_teacher_search_supports_exact_certificate_and_region_modes(client):
    exact = client.get("/api/mp/teachers/search?mode=certificate&q=JY20230001")
    assert exact.status_code == 200
    assert exact.get_json()["total"] == 1
    assert exact.get_json()["items"][0]["name"] == "张三"

    region = client.get("/api/mp/teachers/search?mode=region&city=上海市")
    assert region.status_code == 200
    assert all(item["city"] == "上海市" for item in region.get_json()["items"])


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


def _login_as_teacher(client, teacher_id=1):
    """Login as a teacher via dev mock code and return JWT token."""
    resp = client.post("/api/mp/auth/login", json={"code": f"dev-mock-code-{teacher_id}"})
    return resp.get_json()["token"]


def test_mp_review_submission_creates_admin_visible_review_with_files(client):
    token = _login_as_teacher(client, 1)
    response = client.post(
        "/api/mp/reviews",
        json={
            "teacherId": 1,
            "reviewYear": 2026,
            "files": [
                {
                    "title": "professional portrait",
                    "fileName": "portrait.jpg",
                    "fileType": "image/jpeg",
                    "fileSize": 12345,
                }
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["teacherId"] == 1
    assert payload["reviewYear"] == 2026
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
    token = _login_as_teacher(client, 1)
    missing_files_response = client.post(
        "/api/mp/reviews",
        json={"teacherId": 1, "reviewYear": 2026, "files": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert missing_files_response.status_code == 400

    wrong_teacher_response = client.post(
        "/api/mp/reviews",
        json={"teacherId": 999, "reviewYear": 2026, "files": [{"fileName": "portrait.jpg"}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wrong_teacher_response.status_code == 403


def test_mp_teacher_certification_public_returns_summary_only(client):
    response = client.get("/api/mp/teachers/2/certification")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["teacher"]["id"] == 2
    assert payload["teacher"]["teacherNo"] == "JY20230002"
    assert "daysLeft" not in payload["teacher"]
    assert "reviews" not in payload


def test_mp_teacher_certification_owner_returns_full_data(client):
    token = _login_as_teacher(client, 2)
    response = client.get(
        "/api/mp/teachers/me/certification",
        headers={"Authorization": f"Bearer {token}"},
    )

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


def test_mp_phone_binding_links_matching_teacher_record(client, monkeypatch):
    from backend.app.api.mp import auth as mp_auth

    monkeypatch.setattr(mp_auth, "get_phone_number", lambda _code: "13800000000")
    login = client.post("/api/mp/auth/login", json={"code": "new-wechat-user"})
    assert login.status_code == 200

    response = client.post(
        "/api/mp/auth/bind-phone",
        json={"code": "phone-code"},
        headers={"Authorization": f"Bearer {login.get_json()['token']}"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["matchedTeacher"] is True
    assert payload["teacherId"] == 1
    assert payload["role"] == "teacher"


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


def test_admin_review_decision_endpoint_is_retired(client):
    response = client.post(
        "/api/admin/reviews/1/decision",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"status": "approved", "comment": "材料完整，准予通过"},
    )

    assert response.status_code == 410
    assert "collaborative" in response.get_json()["error"]


def test_admin_review_decision_endpoint_is_retired_for_every_outcome(client):
    response = client.post(
        "/api/admin/reviews/1/decision",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"status": "archived"},
    )

    assert response.status_code == 410


def test_teacher_password_account_and_teaching_record(client):
    admin_headers = {"Authorization": "Bearer test-admin-token"}
    account = client.post(
        "/api/admin/teacher-accounts", headers=admin_headers,
        json={"teacherId": 1, "username": "JY20230001", "password": "initial-pass"},
    )
    assert account.status_code == 201

    login = client.post("/api/mp/auth/password-login", json={"username": "JY20230001", "password": "initial-pass"})
    assert login.status_code == 200
    assert login.get_json()["mustChangePassword"] is True
    headers = {"Authorization": f"Bearer {login.get_json()['token']}"}
    changed = client.post(
        "/api/mp/auth/change-password", headers=headers,
        json={"currentPassword": "", "newPassword": "changed-pass"},
    )
    assert changed.status_code == 200
    relogin = client.post("/api/mp/auth/password-login", json={"username": "JY20230001", "password": "changed-pass"})
    assert relogin.status_code == 200
    record = client.post(
        "/api/mp/teaching-records", headers=headers,
        json={"taughtOn": "2026-06-15", "platform": "上海线下", "title": "晨间流瑜伽", "durationHours": 2},
    )
    assert record.status_code == 201
    records = client.get("/api/mp/teaching-records", headers=headers)
    assert records.get_json()["total"] == 1


def test_collaborative_review_requires_assignment_decision_and_publication(client):
    headers = {"Authorization": "Bearer test-admin-token"}
    cycle = client.post(
        "/api/admin/review-cycles", headers=headers,
        json={"name": "2026 年度年审", "startDate": "2026-01-01", "submissionDeadline": "2026-07-31"},
    )
    assert cycle.status_code == 201
    group = client.post(
        "/api/admin/review-groups", headers=headers,
        json={"name": "L2 审核组", "leaderId": 1, "memberIds": [1], "tierScope": ["L2"]},
    )
    assert group.status_code == 201
    assignment = client.post(
        "/api/admin/reviews/1/assignment", headers=headers,
        json={"cycleId": cycle.get_json()["id"], "groupId": group.get_json()["id"]},
    )
    assert assignment.get_json()["status"] == "in_review"
    opinion = client.post(
        "/api/admin/reviews/1/opinions", headers=headers,
        json={"conclusion": "approved", "comment": "材料完整，建议通过"},
    )
    assert opinion.status_code == 201
    decision = client.post(
        "/api/admin/reviews/1/group-decision", headers=headers,
        json={"conclusion": "approved", "decision": "审核组一致同意通过"},
    )
    assert decision.get_json()["status"] == "pending_publication"
    published = client.post("/api/admin/reviews/1/publish", headers=headers, json={"outcome": "approved"})
    assert published.get_json()["status"] == "published_approved"


def test_group_decision_requires_member_opinions_and_can_be_returned(client):
    headers = {"Authorization": "Bearer test-admin-token"}
    cycle = client.post("/api/admin/review-cycles", headers=headers, json={"name": "退回测试批次", "startDate": "2026-01-01", "submissionDeadline": "2026-07-31"})
    group = client.post("/api/admin/review-groups", headers=headers, json={"name": "退回测试审核组", "leaderId": 1, "memberIds": [1], "tierScope": ["L2"]})
    client.post("/api/admin/reviews/1/assignment", headers=headers, json={"cycleId": cycle.get_json()["id"], "groupId": group.get_json()["id"]})
    blocked = client.post("/api/admin/reviews/1/group-decision", headers=headers, json={"conclusion": "approved", "decision": "缺少意见"})
    assert blocked.status_code == 409
    client.post("/api/admin/reviews/1/opinions", headers=headers, json={"conclusion": "approved", "comment": "材料完整"})
    client.post("/api/admin/reviews/1/group-decision", headers=headers, json={"conclusion": "approved", "decision": "同意通过"})
    returned = client.post("/api/admin/reviews/1/return-to-group", headers=headers, json={"reason": "请补充有效期说明"})
    assert returned.status_code == 200
    workflow = client.get("/api/admin/reviews/1/workflow", headers=headers).get_json()
    assert workflow["status"] == "returned_to_group"
    assert workflow["opinionProgress"] == {"submitted": 1, "required": 1}


def test_teaching_records_can_be_drafted_filtered_and_referenced_by_review(client):
    token = _login_as_teacher(client, 1)
    headers = {"Authorization": f"Bearer {token}"}
    draft = client.post("/api/mp/teaching-records", headers=headers, json={"taughtOn": "2026-06-15", "status": "draft"})
    assert draft.status_code == 201
    submitted = client.put(f"/api/mp/teaching-records/{draft.get_json()['id']}", headers=headers, json={"platform": "上海线下", "title": "晨间流瑜伽", "status": "submitted"})
    assert submitted.status_code == 200
    filtered = client.get("/api/mp/teaching-records?month=2026-06", headers=headers)
    assert filtered.get_json()["total"] == 1
    review = client.post("/api/mp/reviews", headers=headers, json={"reviewYear": 2026, "files": [], "teachingRecordIds": [draft.get_json()["id"]]})
    assert review.status_code == 201


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


def test_super_admin_can_update_another_admin_role_but_not_their_own(client):
    headers = {"Authorization": "Bearer test-admin-token"}
    created = client.post(
        "/api/admin/permissions/invite",
        headers=headers,
        json={"username": "reviewer-one", "password": "reviewer-pass", "role": "reviewer"},
    )
    assert created.status_code == 201
    admin_id = created.get_json()["id"]

    updated = client.put(
        f"/api/admin/permissions/{admin_id}/role",
        headers=headers,
        json={"role": "group_leader"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["role"] == "group_leader"

    self_update = client.put(
        "/api/admin/permissions/1/role",
        headers=headers,
        json={"role": "reviewer"},
    )
    assert self_update.status_code == 409


def test_admin_user_list_and_role_update(client):
    token = _login_as_teacher(client, 1)

    response = client.get(
        "/api/admin/users",
        headers={"Authorization": "Bearer test-admin-token"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total"] >= 1
    user = payload["items"][0]
    assert user["role"] == "teacher"
    assert user["teacherId"] == 1
    assert "avatarUrl" in user
    assert "nickname" in user

    update_response = client.put(
        f"/api/admin/users/{user['id']}/role",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"role": "student"},
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["role"] == "student"
    assert update_response.get_json()["teacherId"] is None

    restore_response = client.put(
        f"/api/admin/users/{user['id']}/role",
        headers={"Authorization": "Bearer test-admin-token"},
        json={"role": "teacher", "teacherId": 1},
    )
    assert restore_response.status_code == 200
    assert restore_response.get_json()["role"] == "teacher"
    assert restore_response.get_json()["teacherId"] == 1


def test_mp_auth_me_includes_avatar_and_phone(client):
    token = _login_as_teacher(client, 1)
    response = client.get(
        "/api/mp/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert "avatarUrl" in payload
    assert "nickname" in payload
    assert "phone" in payload
    assert payload["role"] == "teacher"


def test_mp_update_profile_sets_nickname(client):
    token = _login_as_teacher(client, 1)
    response = client.post(
        "/api/mp/auth/update-profile",
        headers={"Authorization": f"Bearer {token}"},
        data={"nickname": "瑜伽老师"},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["nickname"] == "瑜伽老师"

    me_response = client.get(
        "/api/mp/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.get_json()["nickname"] == "瑜伽老师"

    avatar_response = client.post(
        "/api/mp/auth/update-profile",
        headers={"Authorization": f"Bearer {token}"},
        data={"avatar": (BytesIO(b"test-avatar"), "avatar.png")},
        content_type="multipart/form-data",
    )
    assert avatar_response.status_code == 200
    assert avatar_response.get_json()["teacherAvatarUrl"]
    with client.application.app_context():
        teacher_avatar = Teacher.query.get(1).avatar_url
        user_avatar = User.query.get(1).avatar_url
        assert teacher_avatar.startswith("/uploads/avatars/")
        assert teacher_avatar == user_avatar


def test_mp_login_response_includes_avatar_fields(client):
    response = client.post(
        "/api/mp/auth/login",
        json={"code": "dev-mock-code-1"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert "avatarUrl" in payload
    assert "nickname" in payload
