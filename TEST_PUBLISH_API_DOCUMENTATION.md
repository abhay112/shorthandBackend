# Test Publish/Unpublish API Documentation

## Overview
This documentation describes the API endpoint for toggling test publication status. The single endpoint can publish or unpublish tests. When a test is published, it becomes available to students. When unpublished, it's hidden from students but remains accessible to admins.

## Base URL
```
http://localhost:3000/api/v1/admin/tests
```

## Authentication
The endpoint requires:
- **Firebase Authentication Token** in the `Authorization` header
- **Admin Role** (user must be an admin)

### Headers
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

---

## Endpoint

### Toggle Test Publication

Toggles the publication status of a test. If the test is unpublished, it will be published. If published, it will be unpublished. You can also explicitly set the desired state using the `publish` parameter.

**Endpoint:** `POST /api/v1/admin/tests/:testId/toggle-publication`

**Path Parameters:**
- `testId` (string, required) - The ID of the test to toggle

**Request Body (Optional):**
```json
{
  "publish": true  // Optional: explicitly set to true (publish) or false (unpublish). If omitted, toggles current state.
}
```

**Request Examples:**

**Toggle (default behavior - omitting publish parameter):**
```javascript
// Using fetch - automatically toggles current state
const response = await fetch(`http://localhost:3000/api/v1/admin/tests/${testId}/toggle-publication`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  }
  // No body - will toggle current state
});

const data = await response.json();
```

**Explicitly Publish:**
```javascript
const response = await fetch(`http://localhost:3000/api/v1/admin/tests/${testId}/toggle-publication`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ publish: true })
});

const data = await response.json();
```

**Explicitly Unpublish:**
```javascript
const response = await fetch(`http://localhost:3000/api/v1/admin/tests/${testId}/toggle-publication`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ publish: false })
});

const data = await response.json();
```

**Success Response (200 OK) - When Published:**
```json
{
  "success": true,
  "message": "Test published successfully",
  "data": {
    "test": {
      "_id": "692871e69ac94a2121432ce2",
      "title": "test 1",
      "description": "",
      "testType": "practice",
      "difficulty": "beginner",
      "category": "speed_test",
      "duration": 1200,
      "maxRetakes": 5,
      "isPublished": true,
      "publishedAt": "2025-11-27T21:45:00.000Z",
      "isActive": true,
      "isBlocked": false,
      "createdAt": "2025-11-27T15:44:38.369Z",
      "updatedAt": "2025-11-27T21:45:00.000Z",
      "uploadedBy": {
        "_id": "68c6985b0f1df2747c8debf1",
        "name": "vikalpsingh",
        "email": "vikalpsingh@gmail.com"
      },
      "currentContent": {
        "_id": "692871e69ac94a2121432ce4",
        "version": 1,
        "status": "published",
        "publishedAt": "2025-11-27T21:45:00.000Z"
      },
      "assignedBatches": ["692871f6b35c5e46ef5c30b2"]
    },
    "action": "published"
  }
}
```

**Success Response (200 OK) - When Unpublished:**
```json
{
  "success": true,
  "message": "Test unpublished successfully",
  "data": {
    "test": {
      "_id": "692871e69ac94a2121432ce2",
      "title": "test 1",
      "isPublished": false,
      "publishedAt": null,
      "updatedAt": "2025-11-27T21:46:00.000Z",
      // ... other test fields
    },
    "action": "unpublished"
  }
}
```

**Error Responses:**

**400 Bad Request - Already in Desired State:**
```json
{
  "success": false,
  "message": "Test is already published"
}
```
or
```json
{
  "success": false,
  "message": "Test is already unpublished"
}
```

**400 Bad Request - No Content Available (when trying to publish):**
```json
{
  "success": false,
  "message": "No content available to publish. Please add content to the test first."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Test not found"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Admin access required"
}
```

---

## Frontend Implementation Examples

### React/Next.js Example

```jsx
import { useState } from 'react';

const TestPublishButton = ({ testId, isPublished, onPublishChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTogglePublish = async () => {
    setLoading(true);
    setError(null);

    try {
      const firebaseToken = await getFirebaseToken(); // Your Firebase auth method
      
      // Single endpoint - just toggle (or explicitly set state)
      const response = await fetch(
        `http://localhost:3000/api/v1/admin/tests/${testId}/toggle-publication`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json'
          },
          // Optional: explicitly set state, or omit body to toggle
          body: JSON.stringify({ publish: !isPublished })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update test publication status');
      }

      // Update local state or refetch test data
      onPublishChange(data.data.test);
      
    } catch (err) {
      setError(err.message);
      console.error('Error toggling test publication:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleTogglePublish}
        disabled={loading}
        className={isPublished ? 'btn-unpublish' : 'btn-publish'}
      >
        {loading 
          ? 'Loading...' 
          : isPublished 
            ? 'Unpublish Test' 
            : 'Publish Test'
        }
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default TestPublishButton;
```

### Using Axios

```javascript
import axios from 'axios';

// Toggle test publication (single function for both publish/unpublish)
const toggleTestPublication = async (testId, publish = null) => {
  try {
    const token = await getFirebaseToken();
    
    const body = publish !== null ? { publish } : {}; // Optional: set explicit state or toggle
    
    const response = await axios.post(
      `http://localhost:3000/api/v1/admin/tests/${testId}/toggle-publication`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error toggling test publication:', error.response?.data || error.message);
    throw error;
  }
};

// Usage Examples:

// Toggle current state (automatically)
try {
  const result = await toggleTestPublication('692871e69ac94a2121432ce2');
  console.log(`Test ${result.data.action}:`, result.data.test);
} catch (error) {
  console.error('Failed to toggle test:', error);
}

// Explicitly publish
try {
  const result = await toggleTestPublication('692871e69ac94a2121432ce2', true);
  console.log('Test published:', result.data.test);
} catch (error) {
  console.error('Failed to publish test:', error);
}

// Explicitly unpublish
try {
  const result = await toggleTestPublication('692871e69ac94a2121432ce2', false);
  console.log('Test unpublished:', result.data.test);
} catch (error) {
  console.error('Failed to unpublish test:', error);
}
```

### Vue.js Example

```vue
<template>
  <div>
    <button 
      @click="togglePublish" 
      :disabled="loading"
      :class="test.isPublished ? 'btn-unpublish' : 'btn-publish'"
    >
      {{ loading ? 'Loading...' : (test.isPublished ? 'Unpublish' : 'Publish') }}
    </button>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  props: {
    test: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      error: null
    };
  },
  methods: {
    async togglePublish() {
      this.loading = true;
      this.error = null;

      try {
        const token = await this.getFirebaseToken();
        const endpoint = this.test.isPublished ? 'unpublish' : 'publish';
        
        const response = await fetch(
          `http://localhost:3000/api/v1/admin/tests/${this.test._id}/toggle-publication`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publish: !this.test.isPublished })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        // Emit event to parent component
        this.$emit('test-updated', data.data.test);
        
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async getFirebaseToken() {
      // Implement your Firebase token retrieval logic
      return await this.$firebase.auth().currentUser.getIdToken();
    }
  }
};
</script>
```

---

## Important Notes

### 1. **Publishing Requirements**
- A test must have content (`currentContent` or `draftContent`) to be published
- If a test has draft content, it will be published as the new version
- Once published, the test becomes visible to students in their assigned batches

### 2. **Unpublishing Behavior**
- Unpublishing a test makes it immediately unavailable to students
- Students who already have access will lose access
- Admins can still view and manage unpublished tests
- Test data (results, rankings) are preserved

### 3. **Test Status Flow**
```
Draft (isPublished: false) 
  → Publish 
  → Published (isPublished: true) 
  → Unpublish 
  → Draft (isPublished: false)
```

### 4. **Content Publishing**
- When publishing, if draft content exists, it becomes the published content
- Previous published content versions are archived
- The test's `currentContent` is updated to the newly published content

### 5. **Batch Assignments**
- Publishing/unpublishing does not affect batch assignments
- Tests must be both:
  - Published (`isPublished: true`)
  - Assigned to a batch (via `BatchTestAssignment`)
  - Not closed for that batch
  - Active (`isActive: true`)
  
  ...for students to see them

---

## UI Recommendations

### 1. **Test List View**
- Show a badge/icon indicating published status
- Display "Published" (green) or "Draft" (gray) status
- Include a toggle button or action menu item

### 2. **Test Detail View**
- Show publication status prominently
- Display publish/unpublish button based on current status
- Show publication date if published
- Disable publish button if no content exists (show tooltip)

### 3. **Confirmation Dialogs**
- Ask for confirmation before unpublishing (since it affects students)
- Show warning: "This will hide the test from all students"

### 4. **Status Indicators**
```jsx
// Example status badge
{test.isPublished ? (
  <Badge color="green">Published</Badge>
) : (
  <Badge color="gray">Draft</Badge>
)}
```

---

## Error Handling Best Practices

1. **Always check response status** before accessing data
2. **Display user-friendly error messages** from the API response
3. **Handle network errors** separately from API errors
4. **Show loading states** during API calls
5. **Validate testId** before making requests

```javascript
const handleTogglePublish = async (testId, currentState) => {
  if (!testId) {
    showError('Test ID is required');
    return;
  }

  try {
    setLoading(true);
    const result = await toggleTestPublication(testId); // Automatically toggles
    // or: await toggleTestPublication(testId, !currentState); // Explicitly set state
    
    const action = result.data.action;
    showSuccess(`Test ${action} successfully`);
    refreshTestList();
  } catch (error) {
    if (error.response?.status === 400) {
      showError(error.response.data.message);
    } else if (error.response?.status === 404) {
      showError('Test not found');
    } else {
      showError('Failed to toggle test publication. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

---

## Testing Checklist

- [ ] Test toggling from unpublished to published
- [ ] Test toggling from published to unpublished
- [ ] Test publishing a test without content (should fail)
- [ ] Test toggling an already published test (should fail with appropriate message)
- [ ] Test explicitly setting publish: true
- [ ] Test explicitly setting publish: false
- [ ] Test with publish parameter omitted (auto-toggle)
- [ ] Test with invalid test ID (should return 404)
- [ ] Test without authentication (should return 401)
- [ ] Test with non-admin user (should return 403)
- [ ] Verify published test appears for students
- [ ] Verify unpublished test disappears for students

---

## Support

For questions or issues, contact the backend team or refer to the main API documentation.

**API Version:** v1  
**Last Updated:** November 27, 2025

