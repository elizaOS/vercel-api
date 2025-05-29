# Vercel APIs

A comprehensive Next.js API suite that provides various services for Eliza projects, including cached plugin registry data and file proxy services.

## Overview

This API collection includes multiple endpoints designed to support Eliza projects:

- **Plugin Registry API**: Replicates the parsing logic from the Eliza CLI's `parse-registry` utility, running server-side with a provided GitHub token to fetch plugin metadata from GitHub repositories and npm
- **Catbox Proxy API**: Provides a proxy service for accessing and uploading files to Catbox.moe, enabling secure file operations without exposing client applications directly to external services

## Features

### Plugin Registry API
- 🔄 **Automatic Registry Parsing**: Fetches and processes plugin data from GitHub and npm
- ⚡ **Smart Caching**: 30-minute in-memory cache with stale-while-revalidate strategy
- 🛡️ **Error Handling**: Returns stale data on errors, graceful timeouts
- 🔍 **Version Detection**: Analyzes v0.x and v1.x compatibility for each plugin
- 🌐 **CORS Support**: Allows cross-origin requests for web applications

### Catbox Proxy API
- 📤 **File Upload Proxy**: Secure proxy for uploading files to Catbox.moe
- 📥 **File Download Proxy**: Access Catbox files through the proxy with proper content type detection
- 🚀 **Dynamic Routing**: Support for both query parameter and URL path-based file access
- 🛡️ **CORS Enabled**: Full CORS support for web applications
- ⚡ **Caching**: Optimized caching headers for file downloads

## API Endpoints

### Plugin Registry

#### GET /api/plugins/registry

Returns the processed plugin registry data.

**Response Format:**
```json
{
  "lastUpdatedAt": "2024-01-01T00:00:00.000Z",
  "registry": {
    "@elizaos/plugin-example": {
      "git": {
        "repo": "elizaos/plugin-example",
        "v0": {
          "version": "0.1.5",
          "branch": "main"
        },
        "v1": {
          "version": "1.0.2",
          "branch": "main"
        }
      },
      "npm": {
        "repo": "@elizaos/plugin-example",
        "v0": "0.1.5",
        "v1": "1.0.2"
      },
      "supports": {
        "v0": true,
        "v1": true
      }
    }
  }
}
```

### Catbox Proxy

#### POST /api/catbox

Proxies file upload requests to Catbox.moe. Accepts FormData with the same parameters as the Catbox API.

**Parameters:**
- `reqtype`: Request type (e.g., "fileupload")
- `fileToUpload`: The file to upload
- `userhash`: (Optional) User hash for account uploads
- `timeout`: (Optional) Request timeout in milliseconds (default: 30000)

**Response:**
Returns the Catbox.moe response directly (typically a URL to the uploaded file).

#### GET /api/catbox?file={fileId}

Downloads a file from Catbox.moe through the proxy.

**Parameters:**
- `file`: File ID or full Catbox URL
- `timeout`: (Optional) Request timeout in milliseconds (default: 30000)

**Response:**
Returns the file data with appropriate content type headers.

#### GET /api/catbox/{fileId}

Alternative endpoint for downloading files using dynamic routing.

**Parameters:**
- `fileId`: The Catbox file ID
- `timeout`: (Optional) Request timeout in milliseconds (default: 30000)

**Response:**
Returns the file data with appropriate content type headers.
          "branch": "main"
        },
        "v1": {
          "version": "1.0.2",
          "branch": "main"
        }
      },
      "npm": {
        "repo": "@elizaos/plugin-example",
        "v0": "0.1.5",
        "v1": "1.0.2"
      },
      "supports": {
        "v0": true,
        "v1": true
      }
    }
  }
}
```

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Add your GitHub token to `.env`:
   ```env
   GITHUB_TOKEN=your_github_token_here
   ```

3. **Development:**
   ```bash
   npm run dev
   ```
   
   The APIs will be available at:
   - Plugin Registry: `http://localhost:3000/api/plugins/registry`
   - Catbox Upload: `http://localhost:3000/api/catbox` (POST)
   - Catbox Download: `http://localhost:3000/api/catbox?file={fileId}` (GET)
   - Catbox Download (Dynamic): `http://localhost:3000/api/catbox/{fileId}` (GET)

## Usage Examples

### Plugin Registry

#### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/api/plugins/registry');
const data = await response.json();

// Access plugin information
const pluginInfo = data.registry['@elizaos/plugin-twitter'];
console.log('Supports v1:', pluginInfo.supports.v1);
console.log('Latest v1 version:', pluginInfo.npm.v1);
```

#### React Hook
```typescript
import { useQuery } from '@tanstack/react-query';

function usePluginRegistry() {
  return useQuery({
    queryKey: ['plugin-registry'],
    queryFn: async () => {
      const response = await fetch('/api/plugins/registry');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

### Catbox Proxy

#### File Upload
```typescript
// Upload a file to Catbox through the proxy
const formData = new FormData();
formData.append('reqtype', 'fileupload');
formData.append('fileToUpload', file);

const response = await fetch('/api/catbox', {
  method: 'POST',
  body: formData
});

const fileUrl = await response.text();
console.log('Uploaded file URL:', fileUrl);
```

#### File Download (Query Parameter)
```typescript
// Download a file using query parameter
const fileId = 'abc123.jpg';
const response = await fetch(`/api/catbox?file=${fileId}`);
const blob = await response.blob();

// Create download link
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = fileId;
a.click();
```

#### File Download (Dynamic Route)
```typescript
// Download a file using dynamic route
const fileId = 'abc123.jpg';
const response = await fetch(`/api/catbox/${fileId}`);
const blob = await response.blob();

// Use as image source
const imageUrl = URL.createObjectURL(blob);
document.getElementById('myImage').src = imageUrl;
```

## Architecture

### Plugin Registry Data Flow
1. API receives request for registry data
2. Checks in-memory cache (30-minute TTL)
3. If cache miss or expired:
   - Fetches plugin list from GitHub registry
   - For each plugin, analyzes GitHub repo and npm package
   - Determines version compatibility based on dependencies
   - Caches result in memory
4. Returns cached data with appropriate cache headers

### Catbox Proxy Data Flow
1. **Upload Flow (POST /api/catbox)**:
   - Receives FormData from client
   - Forwards request to Catbox.moe API
   - Returns Catbox response (file URL) to client

2. **Download Flow (GET /api/catbox)**:
   - Extracts file ID from query parameter or URL path
   - Fetches file from Catbox.moe
   - Determines content type from response headers or file extension
   - Streams file data back to client with proper headers

### Caching Strategy

#### Plugin Registry
- **In-Memory Cache**: 30-minute TTL for fast responses
- **HTTP Cache**: 30-minute cache with 1-hour stale-while-revalidate
- **Error Fallback**: Returns stale data if parsing fails
- **Timeout Protection**: 25-second timeout prevents hanging requests

#### Catbox Proxy
- **File Caching**: 1-year cache for downloaded files (public, immutable content)
- **Header Forwarding**: Preserves ETag, Last-Modified, and Content-Range headers
- **Stream Processing**: Efficient memory usage for large files
- **Error Handling**: Appropriate HTTP status codes (404 for missing files, 500 for server errors)
