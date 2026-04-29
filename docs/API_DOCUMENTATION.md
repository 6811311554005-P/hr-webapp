# Employee API Documentation

Complete REST API for managing employee records using Prisma and Next.js App Router.

## Overview

All endpoints require authentication via NextAuth. Include a valid JWT token in your request (automatically handled by the browser).

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/employees` | List all employees | ✅ |
| POST | `/api/employees` | Create new employee | ✅ |
| PUT | `/api/employees/:id` | Update employee | ✅ |
| DELETE | `/api/employees/:id` | Delete employee | ✅ |

## Endpoints

### 1. GET /api/employees

List all employees with optional pagination and search.

**URL:**
```
GET /api/employees?skip=0&take=10&search=john
```

**Query Parameters:**
- `skip` (optional, default: 0) - Number of records to skip for pagination
- `take` (optional, default: 10) - Number of records to return
- `search` (optional) - Search by firstName, lastName, position, or department

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "position": "Engineer",
      "department": "IT",
      "salary": 75000,
      "startDate": "2023-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "skip": 0,
    "take": 10,
    "pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

**Example (cURL):**
```bash
curl -X GET "http://localhost:3000/api/employees?skip=0&take=10" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

**Example (JavaScript):**
```typescript
const response = await fetch("/api/employees?skip=0&take=10");
const data = await response.json();
console.log(data.data); // Array of employees
```

---

### 2. POST /api/employees

Create a new employee record.

**URL:**
```
POST /api/employees
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "position": "Manager",
  "department": "HR",
  "salary": "85000",
  "startDate": "2024-04-01"
}
```

**Required Fields:**
- `firstName` (string) - Employee first name
- `lastName` (string) - Employee last name
- `position` (string) - Job position
- `department` (string) - Department name
- `salary` (string or number) - Annual salary
- `startDate` (string) - Start date (ISO format: YYYY-MM-DD)

**Response (201 Created):**
```json
{
  "id": 26,
  "firstName": "Jane",
  "lastName": "Smith",
  "position": "Manager",
  "department": "HR",
  "salary": 85000,
  "startDate": "2024-04-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

**Example (JavaScript):**
```typescript
const response = await fetch("/api/employees", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "Jane",
    lastName: "Smith",
    position: "Manager",
    department: "HR",
    salary: "85000",
    startDate: "2024-04-01"
  })
});

const employee = await response.json();
console.log(employee); // New employee object
```

---

### 3. PUT /api/employees/:id

Update an existing employee record.

**URL:**
```
PUT /api/employees/1
```

**Request Body (all fields optional):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Engineer",
  "department": "IT",
  "salary": "95000",
  "startDate": "2023-01-15"
}
```

**Fields:**
- `firstName` (string, optional) - Employee first name
- `lastName` (string, optional) - Employee last name
- `position` (string, optional) - Job position
- `department` (string, optional) - Department name
- `salary` (string or number, optional) - Annual salary
- `startDate` (string, optional) - Start date (ISO format)

**Response (200 OK):**
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Engineer",
  "department": "IT",
  "salary": 95000,
  "startDate": "2023-01-15T00:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid employee ID
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Employee not found
- `500 Internal Server Error` - Server error

**Example (JavaScript):**
```typescript
const response = await fetch("/api/employees/1", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    position: "Senior Engineer",
    salary: "95000"
  })
});

const updated = await response.json();
console.log(updated);
```

---

### 4. DELETE /api/employees/:id

Delete an employee record.

**URL:**
```
DELETE /api/employees/1
```

**Response (200 OK):**
```json
{
  "message": "Employee deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid employee ID
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Employee not found
- `500 Internal Server Error` - Server error

**Example (JavaScript):**
```typescript
const response = await fetch("/api/employees/1", {
  method: "DELETE"
});

if (response.ok) {
  console.log("Employee deleted");
}
```

---

## Authentication

All endpoints require a valid NextAuth session. Sessions are automatically handled by:

1. **Cookies** - JWT token stored in `next-auth.session-token` cookie (httpOnly)
2. **NextAuth Configuration** - Validates token on each request
3. **Server Session** - `getServerSession()` verifies authorization

**Note:** When using these APIs from a browser or Next.js client component, authentication is automatic (cookies sent with requests).

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request (invalid data) |
| 401 | Unauthorized (not authenticated) |
| 404 | Not Found (employee doesn't exist) |
| 500 | Internal Server Error |

## Data Types

```typescript
interface Employee {
  id: number;               // Auto-generated ID
  firstName: string;        // Employee first name
  lastName: string;         // Employee last name
  position: string;         // Job title/position
  department: string;       // Department name
  salary: number;           // Annual salary (decimal)
  startDate: string;        // Start date (ISO 8601 format)
}

interface PaginationMeta {
  total: number;            // Total employees matching filter
  skip: number;             // Offset used
  take: number;             // Limit used
  pages: number;            // Total pages
}
```

## Common Use Cases

### Fetch all employees
```typescript
const response = await fetch("/api/employees");
const { data } = await response.json();
```

### Search for employees
```typescript
const response = await fetch("/api/employees?search=john");
const { data } = await response.json();
```

### Paginate results
```typescript
const response = await fetch("/api/employees?skip=0&take=20");
const { data, pagination } = await response.json();
```

### Create employee
```typescript
const response = await fetch("/api/employees", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    firstName: "Alice",
    lastName: "Johnson",
    position: "Designer",
    department: "Design",
    salary: "70000",
    startDate: "2024-04-01"
  })
});
```

### Update employee
```typescript
const response = await fetch("/api/employees/1", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ position: "Senior Designer" })
});
```

### Delete employee
```typescript
const response = await fetch("/api/employees/1", {
  method: "DELETE"
});
```

## File Structure

```
app/
├── api/
│   └── employees/
│       ├── route.ts          # GET, POST
│       └── [id]/
│           └── route.ts      # PUT, DELETE
├── employees/
│   └── page.tsx              # Frontend (uses API)
```

## Error Handling

Always check response status before parsing JSON:

```typescript
const response = await fetch("/api/employees");

if (!response.ok) {
  const error = await response.json();
  console.error("Error:", error.error);
} else {
  const data = await response.json();
  console.log("Success:", data);
}
```

## Testing

### Using Thunder Client or Postman

1. **GET all employees:**
   - Method: GET
   - URL: `http://localhost:3000/api/employees`
   - Headers: (browser sends cookies automatically)

2. **Create employee:**
   - Method: POST
   - URL: `http://localhost:3000/api/employees`
   - Headers: `Content-Type: application/json`
   - Body: 
     ```json
     {
       "firstName": "Test",
       "lastName": "User",
       "position": "Tester",
       "department": "QA",
       "salary": "60000",
       "startDate": "2024-04-28"
     }
     ```

3. **Update employee:**
   - Method: PUT
   - URL: `http://localhost:3000/api/employees/1`
   - Headers: `Content-Type: application/json`
   - Body: `{ "position": "Updated Position" }`

4. **Delete employee:**
   - Method: DELETE
   - URL: `http://localhost:3000/api/employees/1`

## Frontend Integration

The employees page (`app/employees/page.tsx`) already implements:

- ✅ Fetching employees on page load
- ✅ Displaying employees in a table
- ✅ Deleting employees with confirmation
- ✅ Error handling
- ✅ Loading states

To add create/update functionality, see the employees page for examples.

---

**All APIs are protected by authentication and use Prisma for database access.** 🔐
