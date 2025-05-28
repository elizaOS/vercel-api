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

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the incoming request
    const formData = await request.formData();

    // Create a new FormData object to forward to Catbox
    const catboxForm = new FormData();

    // Copy all form fields to the new form
    for (const [key, value] of formData.entries()) {
      catboxForm.append(key, value);
    }

    // Get timeout from query params or use default
    const timeoutParam = request.nextUrl.searchParams.get("timeout");
    const timeoutMs = timeoutParam ? parseInt(timeoutParam) : 30000;

    console.log("[CATBOX PROXY] Forwarding request to Catbox.moe");

    // Forward the request to Catbox.moe
    const response = await axios.post(
      "https://catbox.moe/user/api.php",
      catboxForm,
      {
        timeout: timeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          // Let axios set the content-type with boundary for FormData
          ...Object.fromEntries(
            Object.entries(request.headers).filter(
              ([key]) =>
                !key.toLowerCase().startsWith("content-") &&
                !key.toLowerCase().startsWith("host") &&
                !key.toLowerCase().startsWith("x-")
            )
          ),
        },
      }
    );

    console.log(
      "[CATBOX PROXY] Successfully received response from Catbox.moe"
    );

    // Return the Catbox response
    return new NextResponse(response.data, {
      status: response.status,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: unknown) {
    const err = error as RequestError;
    console.error(
      "[CATBOX PROXY] Error forwarding request to Catbox.moe:",
      err.message
    );

    // Return error response
    return NextResponse.json(
      {
        error: "Failed to proxy request to Catbox.moe",
        details: err.message,
        code: err.code || "PROXY_ERROR",
      },
      {
        status: err.response?.status || 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
