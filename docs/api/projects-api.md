# Think AI Projects REST API Documentation

**Version:** 1.0.0
**Design Pattern:** RESTful with HATEOAS
**Based on:** `.claude/skills/api-design-principles/SKILL.md`

---

## Overview

The Projects API provides comprehensive project management for Think AI's film pre-production platform with role-based access control, pagination, filtering, and hypermedia links.

### Base URL
```
https://api.thinkai.com/api/v1
```

### Authentication
```http
Authorization: Bearer <clerk_jwt_token>
```

---

## Role-Based Access Control

| Role | List | Read | Create | Update | Delete |
|------|------|------|--------|--------|--------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| producer | ✓ | ✓ | ✓ | ✓ | ✓ |
| director | ✓ | ✓ | ✓ | ✓ | ✗ |
| writer | ✓ | ✓ | ✗ | ✗ | ✗ |
| storyboard_artist | ✓ | ✓ | ✗ | ✗ | ✗ |
| team_member | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Endpoints

### 1. List Projects (Paginated)

**GET** `/api/v1/projects`

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (≥ 1) |
| page_size | integer | 20 | Items per page (1-100) |
| status | enum | null | Filter by: `planning`, `active`, `in_production`, `post_production`, `completed`, `archived` |
| owner_id | string | null | Filter by project owner |
| search | string | null | Search in name/description |
| tags | string | null | Comma-separated tags |
| sort_by | string | created_at | Sort field |
| sort_order | string | desc | `asc` or `desc` |

#### Example Request
```bash
curl -X GET "https://api.thinkai.com/api/v1/projects?page=1&page_size=20&status=active&tags=drama,short-film" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Example Response (200 OK)
```json
{
  "items": [
    {
      "id": "proj_123",
      "name": "Documentary: Climate Change",
      "description": "A comprehensive documentary about climate change impacts",
      "status": "active",
      "owner_id": "user_456",
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-02T15:30:00Z",
      "budget": 100000.0,
      "start_date": "2025-11-01T00:00:00Z",
      "end_date": null,
      "tags": ["documentary", "environment", "climate"],
      "_links": {
        "self": {"href": "https://api.thinkai.com/api/v1/projects/proj_123"},
        "scripts": {"href": "https://api.thinkai.com/api/v1/projects/proj_123/scripts"},
        "storyboards": {"href": "https://api.thinkai.com/api/v1/projects/proj_123/storyboards"},
        "team": {"href": "https://api.thinkai.com/api/v1/projects/proj_123/team"},
        "update": {
          "href": "https://api.thinkai.com/api/v1/projects/proj_123",
          "method": "PATCH"
        },
        "delete": {
          "href": "https://api.thinkai.com/api/v1/projects/proj_123",
          "method": "DELETE"
        },
        "complete": {
          "href": "https://api.thinkai.com/api/v1/projects/proj_123/complete",
          "method": "POST"
        }
      }
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3,
  "has_next": true,
  "has_prev": false
}
```

---

### 2. Create Project

**POST** `/api/v1/projects`

**Permissions:** admin, producer, director

#### Request Body
```json
{
  "name": "New Film Project",
  "description": "A compelling drama about...",
  "budget": 75000.0,
  "start_date": "2025-12-01T00:00:00Z",
  "tags": ["drama", "indie"]
}
```

#### Example Request
```bash
curl -X POST "https://api.thinkai.com/api/v1/projects" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Film Project",
    "description": "A compelling drama about...",
    "budget": 75000.0,
    "tags": ["drama", "indie"]
  }'
```

#### Response (201 Created)
```json
{
  "id": "proj_new_789",
  "name": "New Film Project",
  "description": "A compelling drama about...",
  "status": "planning",
  "owner_id": "user_456",
  "created_at": "2025-11-04T10:00:00Z",
  "updated_at": "2025-11-04T10:00:00Z",
  "budget": 75000.0,
  "start_date": null,
  "end_date": null,
  "tags": ["drama", "indie"],
  "_links": {
    "self": {"href": "https://api.thinkai.com/api/v1/projects/proj_new_789"},
    "scripts": {"href": "https://api.thinkai.com/api/v1/projects/proj_new_789/scripts"},
    "storyboards": {"href": "https://api.thinkai.com/api/v1/projects/proj_new_789/storyboards"},
    "team": {"href": "https://api.thinkai.com/api/v1/projects/proj_new_789/team"},
    "update": {
      "href": "https://api.thinkai.com/api/v1/projects/proj_new_789",
      "method": "PATCH"
    },
    "start_production": {
      "href": "https://api.thinkai.com/api/v1/projects/proj_new_789/start-production",
      "method": "POST"
    }
  }
}
```

---

### 3. Get Project

**GET** `/api/v1/projects/{project_id}`

**Permissions:** All roles

#### Example Request
```bash
curl -X GET "https://api.thinkai.com/api/v1/projects/proj_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response (200 OK)
Same structure as create response.

#### Error Response (404 Not Found)
```json
{
  "error": "NotFound",
  "message": "Project not found",
  "details": {
    "id": "proj_999"
  },
  "timestamp": "2025-11-04T10:30:00Z",
  "path": "/api/v1/projects/proj_999"
}
```

---

### 4. Update Project (Partial)

**PATCH** `/api/v1/projects/{project_id}`

**Permissions:** admin, producer, director

#### Request Body (all fields optional)
```json
{
  "name": "Updated Project Name",
  "status": "in_production",
  "budget": 85000.0,
  "tags": ["drama", "indie", "festival"]
}
```

#### Example Request
```bash
curl -X PATCH "https://api.thinkai.com/api/v1/projects/proj_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_production",
    "budget": 85000.0
  }'
```

#### Response (200 OK)
Returns updated project with HATEOAS links.

---

### 5. Delete Project

**DELETE** `/api/v1/projects/{project_id}`

**Permissions:** admin, producer

#### Example Request
```bash
curl -X DELETE "https://api.thinkai.com/api/v1/projects/proj_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response (204 No Content)
Empty response body.

---

## Nested Resources

### Get Project Team

**GET** `/api/v1/projects/{project_id}/team`

**Permissions:** All roles

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| page_size | integer | 20 | Items per page (1-100) |
| role | enum | null | Filter by user role |

#### Example Request
```bash
curl -X GET "https://api.thinkai.com/api/v1/projects/proj_123/team?role=writer" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response (200 OK)
```json
{
  "items": [
    {
      "user_id": "user_789",
      "name": "John Writer",
      "email": "john@thinkai.com",
      "role": "writer",
      "joined_at": "2025-11-01T10:00:00Z",
      "_links": {
        "self": {"href": "https://api.thinkai.com/api/v1/users/user_789"},
        "projects": {"href": "https://api.thinkai.com/api/v1/users/user_789/projects"}
      }
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

---

### Add Team Member

**POST** `/api/v1/projects/{project_id}/team`

**Permissions:** admin, producer, director

#### Request Body
```json
{
  "user_id": "user_999",
  "role": "writer"
}
```

#### Response (201 Created)
```json
{
  "user_id": "user_999",
  "project_id": "proj_123",
  "role": "writer",
  "joined_at": "2025-11-04T11:00:00Z",
  "_links": {
    "self": {"href": "https://api.thinkai.com/api/v1/projects/proj_123/team"},
    "project": {"href": "https://api.thinkai.com/api/v1/projects/proj_123"},
    "user": {"href": "https://api.thinkai.com/api/v1/users/user_999"}
  }
}
```

---

### Get Project Scripts

**GET** `/api/v1/projects/{project_id}/scripts`

Returns paginated list of scripts for a project.

---

### Get Project Storyboards

**GET** `/api/v1/projects/{project_id}/storyboards`

Returns paginated list of storyboards for a project.

---

## Custom Actions

### Start Production

**POST** `/api/v1/projects/{project_id}/start-production`

**Permissions:** admin, producer, director

Transitions project from `planning` to `in_production` status.

#### Example Request
```bash
curl -X POST "https://api.thinkai.com/api/v1/projects/proj_123/start-production" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Response (200 OK)
Returns updated project with new status.

---

## Error Responses

All errors follow a consistent format:

### 400 Bad Request
```json
{
  "error": "BadRequest",
  "message": "Invalid request parameters",
  "details": {},
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token",
  "details": {},
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions for projects:delete",
  "details": {
    "required_roles": ["admin", "producer"],
    "user_role": "writer"
  },
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects/proj_123"
}
```

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Project not found",
  "details": {
    "id": "proj_999"
  },
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects/proj_999"
}
```

### 422 Validation Error
```json
{
  "error": "ValidationError",
  "message": "Request validation failed",
  "details": {
    "errors": [
      {
        "field": "name",
        "message": "Field is required",
        "value": null
      },
      {
        "field": "budget",
        "message": "Must be greater than 0",
        "value": -1000
      }
    ]
  },
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred",
  "details": {},
  "timestamp": "2025-11-04T10:00:00Z",
  "path": "/api/v1/projects"
}
```

---

## Design Principles Applied

This API follows the **api-design-principles** skill patterns:

✅ **Resource-Oriented Architecture** - Uses nouns (projects, team, scripts) not verbs
✅ **Proper HTTP Methods** - GET (read), POST (create), PATCH (update), DELETE (remove)
✅ **Pagination** - All collections support page/page_size with metadata
✅ **Filtering** - Query parameters for status, owner, search, tags
✅ **Consistent Errors** - Structured error format across all endpoints
✅ **HATEOAS** - Hypermedia links for API discoverability
✅ **Role-Based Access** - Fine-grained permissions per endpoint
✅ **Nested Resources** - Parent-child relationships in URLs
✅ **Idempotent Operations** - PATCH, DELETE can be called multiple times safely
✅ **Stateless** - Each request contains all necessary auth/context

---

## Rate Limiting

| Role | Requests/Hour |
|------|---------------|
| admin | 5000 |
| producer | 2000 |
| director | 2000 |
| writer | 1000 |
| storyboard_artist | 1000 |
| team_member | 500 |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699099200
```

---

## Versioning

**Current Version:** v1
**Strategy:** URL versioning (`/api/v1/...`)

Breaking changes will be introduced in v2 with:
- 6-month deprecation notice
- Parallel support for both versions
- Migration guide provided

---

## Interactive Documentation

**Swagger UI:** https://api.thinkai.com/docs
**ReDoc:** https://api.thinkai.com/redoc
**OpenAPI Spec:** https://api.thinkai.com/openapi.json

---

## SDK Examples

### Python
```python
import requests

# List projects
response = requests.get(
    "https://api.thinkai.com/api/v1/projects",
    headers={"Authorization": f"Bearer {token}"},
    params={"page": 1, "page_size": 20, "status": "active"}
)
projects = response.json()

# Create project
response = requests.post(
    "https://api.thinkai.com/api/v1/projects",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "name": "My Film",
        "description": "A great film",
        "budget": 50000,
        "tags": ["drama"]
    }
)
project = response.json()
```

### JavaScript/TypeScript
```typescript
// List projects
const response = await fetch(
  'https://api.thinkai.com/api/v1/projects?page=1&page_size=20&status=active',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const projects = await response.json();

// Create project
const response = await fetch(
  'https://api.thinkai.com/api/v1/projects',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'My Film',
      description: 'A great film',
      budget: 50000,
      tags: ['drama']
    })
  }
);
const project = await response.json();
```

---

## Next Steps

1. ✅ API design complete
2. ⏳ Integrate with Drizzle ORM database queries
3. ⏳ Add Clerk authentication middleware
4. ⏳ Implement rate limiting
5. ⏳ Generate OpenAPI 3.0 spec
6. ⏳ Write integration tests
7. ⏳ Deploy to production

**Reference:** `.claude/skills/api-design-principles/SKILL.md`
