"""
Tests for Projects REST API
Based on api-design-principles skill patterns
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from app.api.projects import (
    router,
    ProjectStatus,
    UserRole,
    get_current_user_role
)

# Mock the authentication dependency
def mock_admin_role():
    return UserRole.ADMIN

def mock_producer_role():
    return UserRole.PRODUCER

def mock_writer_role():
    return UserRole.WRITER


@pytest.fixture
def client():
    """Create test client"""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestListProjects:
    """Test GET /api/v1/projects endpoint"""

    def test_list_projects_default_pagination(self, client):
        """Test listing projects with default pagination"""
        # Override auth dependency
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects")

        assert response.status_code == 200
        data = response.json()

        # Check pagination structure (Pattern 2 from skill)
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "pages" in data
        assert data["page"] == 1
        assert data["page_size"] == 20

    def test_list_projects_custom_pagination(self, client):
        """Test listing projects with custom page size"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects?page=2&page_size=10")

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["page_size"] == 10

    def test_list_projects_filter_by_status(self, client):
        """Test filtering projects by status"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects?status=active")

        assert response.status_code == 200
        # In real implementation, verify filtered results

    def test_list_projects_search(self, client):
        """Test search functionality"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects?search=documentary")

        assert response.status_code == 200

    def test_list_projects_with_tags(self, client):
        """Test filtering by tags"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects?tags=drama,indie")

        assert response.status_code == 200


class TestCreateProject:
    """Test POST /api/v1/projects endpoint"""

    def test_create_project_success(self, client):
        """Test successful project creation"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.post(
            "/api/v1/projects",
            json={
                "name": "New Film Project",
                "description": "A great film",
                "budget": 50000.0,
                "tags": ["drama", "indie"]
            }
        )

        assert response.status_code == 201
        data = response.json()

        # Check response structure
        assert data["name"] == "New Film Project"
        assert data["description"] == "A great film"
        assert data["budget"] == 50000.0
        assert data["status"] == "planning"
        assert data["tags"] == ["drama", "indie"]

        # Check HATEOAS links (Pattern 4 from skill)
        assert "_links" in data
        assert "self" in data["_links"]
        assert "scripts" in data["_links"]
        assert "storyboards" in data["_links"]
        assert "team" in data["_links"]

    def test_create_project_forbidden_for_writer(self, client):
        """Test that writers cannot create projects (RBAC)"""
        router.dependency_overrides[get_current_user_role] = mock_writer_role

        response = client.post(
            "/api/v1/projects",
            json={
                "name": "New Film Project",
                "description": "A great film"
            }
        )

        assert response.status_code == 403
        error = response.json()

        # Check error structure (Pattern 3 from skill)
        assert error["detail"]["error"] == "Forbidden"
        assert "required_roles" in error["detail"]["details"]
        assert error["detail"]["details"]["user_role"] == "writer"

    def test_create_project_minimal_fields(self, client):
        """Test creating project with only required fields"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.post(
            "/api/v1/projects",
            json={"name": "Minimal Project"}
        )

        assert response.status_code == 201


class TestGetProject:
    """Test GET /api/v1/projects/{project_id} endpoint"""

    def test_get_project_success(self, client):
        """Test getting a project by ID"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123")

        assert response.status_code == 200
        data = response.json()

        # Check project structure
        assert "id" in data
        assert "name" in data
        assert "status" in data
        assert "created_at" in data
        assert "updated_at" in data

        # Check HATEOAS links
        assert "_links" in data
        assert data["_links"]["self"]["href"].endswith("/proj_123")

    def test_get_project_not_found(self, client):
        """Test 404 error for nonexistent project"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/nonexistent")

        assert response.status_code == 404
        error = response.json()

        # Check error structure (Pattern 3 from skill)
        assert error["detail"]["error"] == "NotFound"
        assert error["detail"]["message"] == "Project not found"
        assert error["detail"]["details"]["id"] == "nonexistent"
        assert "timestamp" in error["detail"]
        assert "path" in error["detail"]

    def test_get_project_with_role_specific_links(self, client):
        """Test that HATEOAS links vary by role"""
        # Admin can delete
        router.dependency_overrides[get_current_user_role] = mock_admin_role
        admin_response = client.get("/api/v1/projects/proj_123")
        admin_data = admin_response.json()
        assert "delete" in admin_data["_links"]

        # Writer cannot delete
        router.dependency_overrides[get_current_user_role] = mock_writer_role
        writer_response = client.get("/api/v1/projects/proj_123")
        writer_data = writer_response.json()
        assert "delete" not in writer_data["_links"]


class TestUpdateProject:
    """Test PATCH /api/v1/projects/{project_id} endpoint"""

    def test_update_project_partial(self, client):
        """Test partial update with PATCH (skill lines 33-34)"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.patch(
            "/api/v1/projects/proj_123",
            json={
                "name": "Updated Name",
                "budget": 75000.0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["budget"] == 75000.0

    def test_update_project_status(self, client):
        """Test updating project status"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.patch(
            "/api/v1/projects/proj_123",
            json={"status": "in_production"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_production"

    def test_update_project_forbidden_for_writer(self, client):
        """Test that writers cannot update projects"""
        router.dependency_overrides[get_current_user_role] = mock_writer_role

        response = client.patch(
            "/api/v1/projects/proj_123",
            json={"name": "New Name"}
        )

        assert response.status_code == 403

    def test_update_project_not_found(self, client):
        """Test updating nonexistent project"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.patch(
            "/api/v1/projects/nonexistent",
            json={"name": "New Name"}
        )

        assert response.status_code == 404


class TestDeleteProject:
    """Test DELETE /api/v1/projects/{project_id} endpoint"""

    def test_delete_project_success(self, client):
        """Test successful project deletion"""
        router.dependency_overrides[get_current_user_role] = mock_admin_role

        response = client.delete("/api/v1/projects/proj_123")

        # 204 No Content (skill line 35)
        assert response.status_code == 204
        assert response.text == ""

    def test_delete_project_forbidden_for_director(self, client):
        """Test that directors cannot delete projects"""
        router.dependency_overrides[get_current_user_role] = UserRole.DIRECTOR

        response = client.delete("/api/v1/projects/proj_123")

        assert response.status_code == 403

    def test_delete_project_not_found(self, client):
        """Test deleting nonexistent project"""
        router.dependency_overrides[get_current_user_role] = mock_admin_role

        response = client.delete("/api/v1/projects/nonexistent")

        assert response.status_code == 404


class TestNestedResources:
    """Test nested resource endpoints (skill lines 82-84)"""

    def test_list_project_team(self, client):
        """Test GET /api/v1/projects/{project_id}/team"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123/team")

        assert response.status_code == 200
        data = response.json()

        # Check pagination
        assert "items" in data
        assert "total" in data

        # Check team member structure
        if data["items"]:
            member = data["items"][0]
            assert "user_id" in member
            assert "role" in member
            assert "_links" in member

    def test_list_project_team_filter_by_role(self, client):
        """Test filtering team by role"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123/team?role=writer")

        assert response.status_code == 200

    def test_add_team_member(self, client):
        """Test POST /api/v1/projects/{project_id}/team"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.post(
            "/api/v1/projects/proj_123/team?user_id=user_999&role=writer"
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == "user_999"
        assert data["role"] == "writer"
        assert "_links" in data

    def test_list_project_scripts(self, client):
        """Test GET /api/v1/projects/{project_id}/scripts"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123/scripts")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    def test_list_project_storyboards(self, client):
        """Test GET /api/v1/projects/{project_id}/storyboards"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123/storyboards")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data


class TestCustomActions:
    """Test custom action endpoints"""

    def test_start_production(self, client):
        """Test POST /api/v1/projects/{project_id}/start-production"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.post("/api/v1/projects/proj_123/start-production")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_production"

    def test_start_production_forbidden_for_writer(self, client):
        """Test that writers cannot start production"""
        router.dependency_overrides[get_current_user_role] = mock_writer_role

        response = client.post("/api/v1/projects/proj_123/start-production")

        assert response.status_code == 403


class TestHATEOAS:
    """Test hypermedia links (Pattern 4 from skill)"""

    def test_response_includes_links(self, client):
        """Test that all responses include _links"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123")
        data = response.json()

        assert "_links" in data
        assert "self" in data["_links"]
        assert "href" in data["_links"]["self"]

    def test_links_include_methods(self, client):
        """Test that action links include HTTP method"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/proj_123")
        data = response.json()

        # Action links should have method
        if "update" in data["_links"]:
            assert "method" in data["_links"]["update"]
            assert data["_links"]["update"]["method"] == "PATCH"

    def test_conditional_links_by_status(self, client):
        """Test that links vary based on resource state"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        # In real implementation:
        # - Planning projects have "start_production" link
        # - Active projects have "complete" link
        # - Completed projects don't have action links


class TestErrorHandling:
    """Test error response consistency (Pattern 3 from skill)"""

    def test_error_response_structure(self, client):
        """Test that all errors follow consistent format"""
        router.dependency_overrides[get_current_user_role] = mock_producer_role

        response = client.get("/api/v1/projects/nonexistent")

        assert response.status_code == 404
        error = response.json()["detail"]

        # Check required fields
        assert "error" in error
        assert "message" in error
        assert "timestamp" in error
        assert "path" in error

    def test_validation_error_structure(self, client):
        """Test validation error format"""
        # In real implementation, test with invalid data
        # Should return 422 with structured error details


# Cleanup
@pytest.fixture(autouse=True)
def cleanup():
    """Clean up dependency overrides after each test"""
    yield
    router.dependency_overrides.clear()
