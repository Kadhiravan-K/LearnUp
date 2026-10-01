# LearnUp — API Documentation

**Version:** MVP-0.1  
**Base URL:** `/api`  
**Authentication:** Bearer token (`Authorization: Bearer <supabase_access_token>`)

---

## 1. Overview & Architectural Boundaries

The LearnUp backend provides an HTTP JSON API for managing a user's private YouTube learning library.

### Security Guarantees
- **Authentication Required:** All protected endpoints require a valid Supabase Auth session token via the `Authorization: Bearer <token>` header.
- **Strict Ownership:** Every query and mutation is strictly scoped to the authenticated user derived from the token (`auth.uid()`).
- **Row-Level Security (RLS):** Database queries are executed with scoped clients enforcing PostgreSQL RLS policies.
- **Credential Protection:** YouTube Data API keys and database service credentials remain strictly server-side and are never returned or exposed to the client.
- **Predictable Error Contracts:** Errors return consistent machine-readable codes, user-safe messages, and standard HTTP status codes.

---

## 2. Standard Response Envelope

### Success Response
All successful responses return a JSON object with a `data` key:
```json
{
  "data": { ... }
}
```

### Error Response
All error responses return a JSON object with an `error` key containing a machine-readable `code` and user-friendly `message`:
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "The provided string is not a valid URL",
    "details": { ... }
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Missing or invalid authorization token |
| `FORBIDDEN` | 403 | Authenticated user lacks permission to access resource |
| `INVALID_URL` | 400 | Malformed URL or missing required parameters |
| `UNSUPPORTED_SOURCE` | 400 | URL domain is not YouTube or source format is unsupported |
| `SOURCE_NOT_FOUND` | 404 | YouTube video or playlist does not exist or was deleted |
| `SOURCE_UNAVAILABLE` | 422 / 403 | YouTube video or playlist is private or restricted |
| `DUPLICATE_SOURCE` | 409 / 200 | Normalized source was already imported for this user |
| `NOT_FOUND` | 404 | Requested learning item not found in user library |
| `IMPORT_FAILED` | 502 / 500 | External YouTube API failure or persistence failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error (internal details sanitized) |

---

## 3. Endpoints

### 3.1 Import Learning Item
Accepts a YouTube URL (video or playlist), resolves metadata, and persists the item in the user's library. If the normalized source has already been imported by the user, the existing item is returned idempotently.

- **Method:** `POST`
- **Route:** `/api/learning-items`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <supabase_token>`

#### Request Body
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

#### Supported URL Formats
- Videos:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
- Playlists:
  - `https://www.youtube.com/playlist?list=PLAYLIST_ID`

#### Response: 201 Created (New Video Import)
```json
{
  "data": {
    "id": "c1f7b8d4-5e92-491a-a5f1-3962b9a76d1e",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "type": "video",
    "youtube_video_id": "dQw4w9WgXcQ",
    "youtube_playlist_id": null,
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "normalized_source_key": "video:dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "status": "ready",
    "created_at": "2026-09-24T15:00:00.000Z",
    "updated_at": "2026-09-24T15:00:00.000Z"
  },
  "duplicate": false
}
```

#### Response: 201 Created (New Playlist Import)
```json
{
  "data": {
    "id": "e2a8c9f5-6f03-482b-b6f2-4073c0b87e2f",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "type": "playlist",
    "youtube_video_id": null,
    "youtube_playlist_id": "PL1234567890ABCDEFGHIJ",
    "source_url": "https://www.youtube.com/playlist?list=PL1234567890ABCDEFGHIJ",
    "normalized_source_key": "playlist:PL1234567890ABCDEFGHIJ",
    "title": "Full Web Development Course",
    "thumbnail_url": "https://i.ytimg.com/vi/a1b2c3d4e5/hqdefault.jpg",
    "status": "ready",
    "created_at": "2026-09-24T15:00:00.000Z",
    "updated_at": "2026-09-24T15:00:00.000Z",
    "videos": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "learning_item_id": "e2a8c9f5-6f03-482b-b6f2-4073c0b87e2f",
        "youtube_video_id": "a1b2c3d4e5",
        "title": "Lesson 1: Introduction",
        "thumbnail_url": "https://i.ytimg.com/vi/a1b2c3d4e5/hqdefault.jpg",
        "source_position": 0,
        "created_at": "2026-09-24T15:00:00.000Z"
      },
      {
        "id": "22222222-3333-4444-5555-666666666666",
        "learning_item_id": "e2a8c9f5-6f03-482b-b6f2-4073c0b87e2f",
        "youtube_video_id": "f6g7h8i9j0",
        "title": "Lesson 2: HTML Basics",
        "thumbnail_url": "https://i.ytimg.com/vi/f6g7h8i9j0/hqdefault.jpg",
        "source_position": 1,
        "created_at": "2026-09-24T15:00:00.000Z"
      }
    ]
  },
  "duplicate": false
}
```

#### Response: 200 OK (Idempotent Duplicate Import)
When the user submits an already imported URL, the server returns status 200 and `duplicate: true`:
```json
{
  "data": {
    "id": "c1f7b8d4-5e92-491a-a5f1-3962b9a76d1e",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "type": "video",
    "youtube_video_id": "dQw4w9WgXcQ",
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "normalized_source_key": "video:dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    "status": "ready"
  },
  "duplicate": true
}
```

---

### 3.2 List Learning Items
Returns all learning items in the authenticated user's library, sorted by creation date descending.

- **Method:** `GET`
- **Route:** `/api/learning-items`
- **Headers:**
  - `Authorization: Bearer <supabase_token>`

#### Response: 200 OK
```json
{
  "data": [
    {
      "id": "c1f7b8d4-5e92-491a-a5f1-3962b9a76d1e",
      "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "type": "video",
      "youtube_video_id": "dQw4w9WgXcQ",
      "youtube_playlist_id": null,
      "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "normalized_source_key": "video:dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
      "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "status": "ready",
      "created_at": "2026-09-24T15:00:00.000Z",
      "updated_at": "2026-09-24T15:00:00.000Z"
    }
  ]
}
```

---

### 3.3 Get Learning Item
Retrieves a single learning item owned by the authenticated user. If the item is a playlist, its child videos are returned in preserved `source_position` ascending order.

- **Method:** `GET`
- **Route:** `/api/learning-items/:id`
- **Headers:**
  - `Authorization: Bearer <supabase_token>`

#### Response: 200 OK
```json
{
  "data": {
    "id": "e2a8c9f5-6f03-482b-b6f2-4073c0b87e2f",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "type": "playlist",
    "youtube_video_id": null,
    "youtube_playlist_id": "PL1234567890ABCDEFGHIJ",
    "source_url": "https://www.youtube.com/playlist?list=PL1234567890ABCDEFGHIJ",
    "normalized_source_key": "playlist:PL1234567890ABCDEFGHIJ",
    "title": "Full Web Development Course",
    "thumbnail_url": "https://i.ytimg.com/vi/a1b2c3d4e5/hqdefault.jpg",
    "status": "ready",
    "created_at": "2026-09-24T15:00:00.000Z",
    "updated_at": "2026-09-24T15:00:00.000Z",
    "videos": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "learning_item_id": "e2a8c9f5-6f03-482b-b6f2-4073c0b87e2f",
        "youtube_video_id": "a1b2c3d4e5",
        "title": "Lesson 1: Introduction",
        "thumbnail_url": "https://i.ytimg.com/vi/a1b2c3d4e5/hqdefault.jpg",
        "source_position": 0,
        "created_at": "2026-09-24T15:00:00.000Z"
      }
    ]
  }
}
```

#### Response: 404 Not Found (Cross-user access or non-existent ID)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Learning item not found"
  }
}
```

---

### 3.4 Remove Learning Item
Removes a learning item from the authenticated user's library. If the item is a playlist, child records are automatically removed via database foreign key cascade. The original YouTube source remains unchanged.

- **Method:** `DELETE`
- **Route:** `/api/learning-items/:id`
- **Headers:**
  - `Authorization: Bearer <supabase_token>`

#### Response: 200 OK
```json
{
  "data": {
    "success": true
  }
}
```

#### Response: 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Learning item not found"
  }
}
```
