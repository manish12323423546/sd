"""
Think AI Projects REST API
Designed using api-design-principles skill

Features:
- Resource-oriented RESTful design
- Role-based access control (6 roles)
- Pagination and filtering
- Consistent error handling
- HATEOAS hypermedia links
- Nested resources (scripts, storyboards, team)
"""

from typing import List, Optional, Any
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, HTTPException, Query, Depends, status, Request
from pydantic import BaseModel, Field, UUID4

# ============================================================================
# Pattern 1: Enums for Type Safety (api-design-principles skill)
# ============================================================================

class ProjectStatus(str, Enum):
    """Project status enum"""
    PLANNING = "planning"
    ACTIVE = "active"
    IN_PRODUCTION = "in_production"
    POST_PRODUCTION = "post_production"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class UserRole(str, Enum):
    """Think AI user roles"""
    ADMIN = "admin"
    PRODUCER = "producer"
    DIRECTOR = "director"
    WRITER = "writer"
    STORYBOARD_ARTIST = "storyboard_artist"
    TEAM_MEMBER = "team_member"


# ============================================================================
# Pattern 2: Pagination Response (from skill lines 107-121)
# ============================================================================

class PaginatedResponse(BaseModel):
    """Reusable pagination wrapper - follows api-design-principles"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1


# ============================================================================
# Pattern 3: Error Handling (from skill lines 159-212)
# ============================================================================

class ErrorResponse(BaseModel):
    """Consistent error response format"""
    error: str
    message: str
    details: Optional[dict] = None
    timestamp: str
    path: str


class ValidationErrorDetail(BaseModel):
    """Validation error structure"""
    field: str
    message: str
    value: Any


def raise_not_found(resource: str, resource_id: str, path: str):
    """Standardized 404 error"""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error": "NotFound",
            "message": f"{resource} not found",
            "details": {"id": resource_id},
            "timestamp": datetime.utcnow().isoformat(),
            "path": path
        }
    )


def raise_forbidden(message: str, required_roles: List[str], user_role: str, path: str):
    """Standardized 403 forbidden error for RBAC"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "Forbidden",
            "message": message,
            "details": {
                "required_roles": required_roles,
                "user_role": user_role
            },
            "timestamp": datetime.utcnow().isoformat(),
            "path": path
        }
    )


def raise_validation_error(errors: List[ValidationErrorDetail], path: str):
    """Standardized 422 validation error"""
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": "ValidationError",
            "message": "Request validation failed",
            "details": {"errors": [e.dict() for e in errors]},
            "timestamp": datetime.utcnow().isoformat(),
            "path": path
        }
    )


# ============================================================================
# Resource Models
# ============================================================================

class TeamMember(BaseModel):
    """Team member in a project"""
    user_id: str
    name: str
    email: str
    role: UserRole
    joined_at: datetime


class Project(BaseModel):
    """Project resource model"""
    id: str
    name: str
    description: Optional[str] = None
    status: ProjectStatus
    owner_id: str
    created_at: datetime
    updated_at: datetime
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tags: List[str] = []


# ============================================================================
# Pattern 4: HATEOAS - Hypermedia Links (from skill lines 214-242)
# ============================================================================

class ProjectResponse(BaseModel):
    """Project with hypermedia links for API discoverability"""
    id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    owner_id: str
    created_at: datetime
    updated_at: datetime
    budget: Optional[float]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    tags: List[str]
    _links: dict

    @classmethod
    def from_project(cls, project: Project, user_role: UserRole, base_url: str = ""):
        """Create response with HATEOAS links based on user permissions"""
        project_url = f"{base_url}/api/v1/projects/{project.id}"

        links = {
            "self": {"href": project_url},
            "scripts": {"href": f"{project_url}/scripts"},
            "storyboards": {"href": f"{project_url}/storyboards"},
            "team": {"href": f"{project_url}/team"},
        }

        # Add action links based on role permissions
        can_edit = user_role in [UserRole.ADMIN, UserRole.PRODUCER, UserRole.DIRECTOR]
        can_delete = user_role in [UserRole.ADMIN, UserRole.PRODUCER]

        if can_edit:
            links["update"] = {
                "href": project_url,
                "method": "PATCH"
            }

        if can_delete:
            links["delete"] = {
                "href": project_url,
                "method": "DELETE"
            }

        # Conditional actions based on status
        if project.status == ProjectStatus.PLANNING and can_edit:
            links["start_production"] = {
                "href": f"{project_url}/start-production",
                "method": "POST"
            }

        if project.status == ProjectStatus.ACTIVE and can_edit:
            links["complete"] = {
                "href": f"{project_url}/complete",
                "method": "POST"
            }

        return cls(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            owner_id=project.owner_id,
            created_at=project.created_at,
            updated_at=project.updated_at,
            budget=project.budget,
            start_date=project.start_date,
            end_date=project.end_date,
            tags=project.tags,
            _links=links
        )


# ============================================================================
# Request Models
# ============================================================================

class CreateProjectRequest(BaseModel):
    """Request body for creating a project"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    budget: Optional[float] = Field(None, gt=0)
    start_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list, max_items=10)


class UpdateProjectRequest(BaseModel):
    """Request body for updating a project (partial updates with PATCH)"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[ProjectStatus] = None
    budget: Optional[float] = Field(None, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tags: Optional[List[str]] = Field(None, max_items=10)


# ============================================================================
# Role-Based Access Control Helper
# ============================================================================

ROLE_PERMISSIONS = {
    "projects:list": [UserRole.ADMIN, UserRole.PRODUCER, UserRole.DIRECTOR, UserRole.WRITER, UserRole.STORYBOARD_ARTIST, UserRole.TEAM_MEMBER],
    "projects:read": [UserRole.ADMIN, UserRole.PRODUCER, UserRole.DIRECTOR, UserRole.WRITER, UserRole.STORYBOARD_ARTIST, UserRole.TEAM_MEMBER],
    "projects:create": [UserRole.ADMIN, UserRole.PRODUCER, UserRole.DIRECTOR],
    "projects:update": [UserRole.ADMIN, UserRole.PRODUCER, UserRole.DIRECTOR],
    "projects:delete": [UserRole.ADMIN, UserRole.PRODUCER],
}


def check_permission(user_role: UserRole, permission: str, path: str):
    """Check if user role has permission"""
    allowed_roles = ROLE_PERMISSIONS.get(permission, [])
    if user_role not in allowed_roles:
        raise_forbidden(
            message=f"Insufficient permissions for {permission}",
            required_roles=[role.value for role in allowed_roles],
            user_role=user_role.value,
            path=path
        )


# Dependency to get current user role (mock - replace with actual auth)
async def get_current_user_role() -> UserRole:
    """Get current user's role from authentication token"""
    # TODO: Replace with actual Clerk authentication
    # For now, return mock role
    return UserRole.PRODUCER


# ============================================================================
# Pattern 5: RESTful Endpoints (from skill lines 73-90)
# ============================================================================

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get("", response_model=PaginatedResponse)
async def list_projects(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ProjectStatus] = Query(None, description="Filter by status"),
    owner_id: Optional[str] = Query(None, description="Filter by owner"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    List projects with pagination and filtering.

    Demonstrates:
    - Pattern 2: Pagination (api-design-principles)
    - Query parameter filtering
    - Role-based access control
    - Consistent response structure

    Example:
        GET /api/v1/projects?page=1&page_size=20&status=active&tags=drama,short-film
    """
    check_permission(user_role, "projects:list", str(request.url.path))

    # TODO: Replace with actual database query
    # For demo, return mock data

    # Simulate filtering logic
    total = 42  # Mock total count
    pages = (total + page_size - 1) // page_size

    # Mock projects
    mock_projects = [
        Project(
            id=f"proj_{i}",
            name=f"Film Project {i}",
            description=f"Description for project {i}",
            status=ProjectStatus.ACTIVE,
            owner_id="user_123",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            budget=50000.0,
            tags=["drama", "short-film"]
        )
        for i in range(1, min(page_size + 1, total + 1))
    ]

    # Convert to HATEOAS responses
    items = [
        ProjectResponse.from_project(p, user_role, str(request.base_url).rstrip("/")).dict()
        for p in mock_projects
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectResponse)
async def create_project(
    request: Request,
    body: CreateProjectRequest,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Create new project.

    Demonstrates:
    - POST for resource creation
    - 201 Created status code
    - Input validation with Pydantic
    - Returns created resource with HATEOAS links
    """
    check_permission(user_role, "projects:create", str(request.url.path))

    # TODO: Replace with actual database insert
    new_project = Project(
        id="proj_new_456",
        name=body.name,
        description=body.description,
        status=ProjectStatus.PLANNING,
        owner_id="user_123",  # TODO: Get from authenticated user
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        budget=body.budget,
        start_date=body.start_date,
        tags=body.tags
    )

    return ProjectResponse.from_project(
        new_project,
        user_role,
        str(request.base_url).rstrip("/")
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    request: Request,
    project_id: str,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Get specific project by ID.

    Demonstrates:
    - GET for resource retrieval
    - 404 handling (Pattern 3)
    - HATEOAS links (Pattern 4)
    """
    check_permission(user_role, "projects:read", str(request.url.path))

    # TODO: Replace with actual database query
    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Mock project
    mock_project = Project(
        id=project_id,
        name="Documentary: Climate Change",
        description="A comprehensive documentary about climate change impacts",
        status=ProjectStatus.ACTIVE,
        owner_id="user_123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        budget=100000.0,
        start_date=datetime.utcnow(),
        tags=["documentary", "environment", "climate"]
    )

    return ProjectResponse.from_project(
        mock_project,
        user_role,
        str(request.base_url).rstrip("/")
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    request: Request,
    project_id: str,
    body: UpdateProjectRequest,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Partially update project.

    Demonstrates:
    - PATCH for partial updates (api-design-principles lines 33-34)
    - Only updates provided fields
    - Idempotent operation
    """
    check_permission(user_role, "projects:update", str(request.url.path))

    # TODO: Replace with actual database query and update
    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Mock update logic
    updated_project = Project(
        id=project_id,
        name=body.name or "Original Project Name",
        description=body.description or "Original description",
        status=body.status or ProjectStatus.ACTIVE,
        owner_id="user_123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        budget=body.budget or 50000.0,
        start_date=body.start_date,
        end_date=body.end_date,
        tags=body.tags or []
    )

    return ProjectResponse.from_project(
        updated_project,
        user_role,
        str(request.base_url).rstrip("/")
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    request: Request,
    project_id: str,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Delete project.

    Demonstrates:
    - DELETE for resource removal
    - 204 No Content response
    - Idempotent operation (api-design-principles line 35)
    """
    check_permission(user_role, "projects:delete", str(request.url.path))

    # TODO: Replace with actual database delete
    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Delete and return no content
    return None


# ============================================================================
# Nested Resource Pattern (from skill lines 82-84)
# ============================================================================

@router.get("/{project_id}/team", response_model=PaginatedResponse)
async def list_project_team(
    request: Request,
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Get team members for a specific project.

    Demonstrates:
    - Nested resource pattern
    - Parent-child relationship in URL structure
    """
    check_permission(user_role, "projects:read", str(request.url.path))

    # Verify project exists
    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Mock team members
    mock_team = [
        {
            "user_id": f"user_{i}",
            "name": f"Team Member {i}",
            "email": f"member{i}@thinkai.com",
            "role": UserRole.WRITER.value if i % 2 == 0 else UserRole.DIRECTOR.value,
            "joined_at": datetime.utcnow().isoformat(),
            "_links": {
                "self": {"href": f"/api/v1/users/user_{i}"},
                "projects": {"href": f"/api/v1/users/user_{i}/projects"}
            }
        }
        for i in range(1, 6)
    ]

    return PaginatedResponse(
        items=mock_team,
        total=len(mock_team),
        page=page,
        page_size=page_size,
        pages=1
    )


@router.post("/{project_id}/team", status_code=status.HTTP_201_CREATED)
async def add_team_member(
    request: Request,
    project_id: str,
    user_id: str,
    role: UserRole,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Add team member to project.

    Demonstrates:
    - POST to nested resource
    - Parent ID in URL path
    """
    check_permission(user_role, "projects:update", str(request.url.path))

    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # TODO: Verify user exists and add to project

    return {
        "user_id": user_id,
        "project_id": project_id,
        "role": role.value,
        "joined_at": datetime.utcnow().isoformat(),
        "_links": {
            "self": {"href": f"/api/v1/projects/{project_id}/team"},
            "project": {"href": f"/api/v1/projects/{project_id}"},
            "user": {"href": f"/api/v1/users/{user_id}"}
        }
    }


@router.get("/{project_id}/scripts", response_model=PaginatedResponse)
async def list_project_scripts(
    request: Request,
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_role: UserRole = Depends(get_current_user_role)
):
    """Get scripts for a specific project."""
    check_permission(user_role, "projects:read", str(request.url.path))

    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Mock scripts
    return PaginatedResponse(
        items=[
            {
                "id": f"script_{i}",
                "project_id": project_id,
                "title": f"Script Draft {i}",
                "version": i,
                "created_at": datetime.utcnow().isoformat(),
                "_links": {
                    "self": {"href": f"/api/v1/scripts/script_{i}"},
                    "project": {"href": f"/api/v1/projects/{project_id}"}
                }
            }
            for i in range(1, 4)
        ],
        total=3,
        page=page,
        page_size=page_size,
        pages=1
    )


@router.get("/{project_id}/storyboards", response_model=PaginatedResponse)
async def list_project_storyboards(
    request: Request,
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_role: UserRole = Depends(get_current_user_role)
):
    """Get storyboards for a specific project."""
    check_permission(user_role, "projects:read", str(request.url.path))

    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # Mock storyboards
    return PaginatedResponse(
        items=[
            {
                "id": f"storyboard_{i}",
                "project_id": project_id,
                "title": f"Scene {i} Storyboard",
                "frames": 12,
                "created_at": datetime.utcnow().isoformat(),
                "_links": {
                    "self": {"href": f"/api/v1/storyboards/storyboard_{i}"},
                    "project": {"href": f"/api/v1/projects/{project_id}"},
                    "frames": {"href": f"/api/v1/storyboards/storyboard_{i}/frames"}
                }
            }
            for i in range(1, 3)
        ],
        total=2,
        page=page,
        page_size=page_size,
        pages=1
    )


# ============================================================================
# Custom Actions (Resource-oriented, not action verbs in URL)
# ============================================================================

@router.post("/{project_id}/start-production", response_model=ProjectResponse)
async def start_production(
    request: Request,
    project_id: str,
    user_role: UserRole = Depends(get_current_user_role)
):
    """
    Transition project to production status.

    Note: Uses POST to a resource-oriented endpoint, not an action verb.
    Good: /projects/{id}/start-production
    Bad: /startProduction/{id}
    """
    check_permission(user_role, "projects:update", str(request.url.path))

    if project_id == "nonexistent":
        raise_not_found("Project", project_id, str(request.url.path))

    # TODO: Update project status in database
    updated_project = Project(
        id=project_id,
        name="Project Name",
        description="Project description",
        status=ProjectStatus.IN_PRODUCTION,
        owner_id="user_123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        tags=[]
    )

    return ProjectResponse.from_project(
        updated_project,
        user_role,
        str(request.base_url).rstrip("/")
    )
