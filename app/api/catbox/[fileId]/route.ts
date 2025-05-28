import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Define error interface for better type safety
interface RequestError {
  message: string;
  code?: string;
  response?: {
    status: number;
  };
}

// Helper function to get content type from file extension
function getContentTypeFromExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    'js': 'application/javascript',
    'css': 'text/css',
    'html': 'text/html',
  };
  
  return ext ? mimeTypes[ext] || null : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const params = await context.params;
    const { fileId } = params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: "Missing file ID" },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }

    // Construct the catbox file URL
    const catboxUrl = `https://files.catbox.moe/${fileId}`;
    
    console.log(`[CATBOX PROXY] Fetching file via dynamic route: ${fileId}`);

    // Get timeout from query params or use default
    const timeoutParam = request.nextUrl.searchParams.get("timeout");
    const timeoutMs = timeoutParam ? parseInt(timeoutParam) : 30000;

    // Fetch the file from catbox
    const response = await axios.get(catboxUrl, {
      timeout: timeoutMs,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Catbox-Proxy/1.0)',
        // Forward relevant headers from the original request
        ...Object.fromEntries(
          Object.entries(request.headers).filter(
            ([key]) =>
              key.toLowerCase() === 'range' ||
              key.toLowerCase() === 'if-none-match' ||
              key.toLowerCase() === 'if-modified-since'
          )
        ),
      },
    });

    console.log(`[CATBOX PROXY] Successfully fetched file via dynamic route: ${fileId}`);

    // Get content type from response or try to infer from file extension
    const contentType = response.headers['content-type'] || 
      getContentTypeFromExtension(fileId) || 
      'application/octet-stream';

    // Prepare response headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    };

    // Forward relevant headers from catbox response
    if (response.headers['content-length']) {
      responseHeaders['Content-Length'] = response.headers['content-length'];
    }
    if (response.headers['last-modified']) {
      responseHeaders['Last-Modified'] = response.headers['last-modified'];
    }
    if (response.headers['etag']) {
      responseHeaders['ETag'] = response.headers['etag'];
    }
    if (response.headers['content-range']) {
      responseHeaders['Content-Range'] = response.headers['content-range'];
    }

    // Return the file data
    return new NextResponse(response.data as ReadableStream, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: unknown) {
    const err = error as RequestError;
    console.error(
      "[CATBOX PROXY] Error fetching file from Catbox.moe via dynamic route:",
      err.message
    );

    // Return appropriate error status
    const status = err.response?.status === 404 ? 404 : 500;
    const errorMessage = err.response?.status === 404 ? 
      "File not found" : 
      "Failed to fetch file from Catbox.moe";

    return NextResponse.json(
      {
        error: errorMessage,
        details: err.message,
        code: err.code || "PROXY_ERROR",
      },
      {
        status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}