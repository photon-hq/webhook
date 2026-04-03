import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const REQUEST_ID_BYTE_LENGTH = 8;

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "not_found"
  | "conflict"
  | "internal"
  | "upstream";

export interface ErrorResponseBody {
  category: ErrorCategory;
  code: string;
  error: string;
  request_id: string;
  retry_after?: number;
  retryable: boolean;
  status: number;
  suggested_action: string;
  timestamp: string;
}

interface ErrorCode {
  category: ErrorCategory;
  retry_after?: number;
  retryable: boolean;
  status: number;
  suggested_action: string;
}

export const ERROR_CODES = {
  INVALID_JSON_BODY: {
    status: 400,
    category: "validation",
    retryable: false,
    suggested_action: "Check that the request body is valid JSON.",
  },
  MISSING_REQUIRED_FIELDS: {
    status: 400,
    category: "validation",
    retryable: false,
    suggested_action:
      "Provide serverUrl, apiKey, and webhookUrl as non-empty strings.",
  },
  INVALID_URL_FORMAT: {
    status: 400,
    category: "validation",
    retryable: false,
    suggested_action:
      "Ensure serverUrl and webhookUrl are valid absolute URLs.",
  },
  MISSING_QUERY_PARAMS: {
    status: 400,
    category: "validation",
    retryable: false,
    suggested_action:
      "Provide serverUrl and apiKey as query params or apiKey via x-api-key header.",
  },
  WEBHOOK_ID_REQUIRED: {
    status: 400,
    category: "validation",
    retryable: false,
    suggested_action: "Provide a valid webhook UUID in the URL path.",
  },
  INVALID_CREDENTIALS: {
    status: 401,
    category: "authentication",
    retryable: false,
    suggested_action:
      "Verify that serverUrl is reachable and apiKey is correct.",
  },
  CREDENTIAL_VERIFICATION_TIMEOUT: {
    status: 401,
    category: "authentication",
    retryable: true,
    retry_after: 5,
    suggested_action:
      "The iMessage server did not respond in time. Wait 5 seconds and retry.",
  },
  WEBHOOK_NOT_FOUND: {
    status: 404,
    category: "not_found",
    retryable: false,
    suggested_action:
      "The webhook ID does not exist. Verify the ID or list existing webhooks with GET.",
  },
  CONFLICT_RETRY: {
    status: 409,
    category: "conflict",
    retryable: true,
    retry_after: 1,
    suggested_action:
      "A concurrent request created this webhook. Retry — the existing record will be returned.",
  },
  DATABASE_ERROR: {
    status: 500,
    category: "internal",
    retryable: true,
    retry_after: 2,
    suggested_action:
      "An unexpected database error occurred. Wait 2 seconds and retry. If persistent after 3 attempts, escalate.",
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    category: "internal",
    retryable: true,
    retry_after: 2,
    suggested_action:
      "An unexpected error occurred. Wait 2 seconds and retry. If persistent after 3 attempts, escalate.",
  },
} as const satisfies Record<string, ErrorCode>;

export type ErrorCodeName = keyof typeof ERROR_CODES;

function generateRequestId(): string {
  return `req_${randomBytes(REQUEST_ID_BYTE_LENGTH).toString("hex")}`;
}

export function createErrorResponse(
  code: ErrorCodeName,
  error: string
): NextResponse<ErrorResponseBody> {
  const def = ERROR_CODES[code];

  const body: ErrorResponseBody = {
    error,
    code,
    status: def.status,
    category: def.category,
    retryable: def.retryable,
    suggested_action: def.suggested_action,
    request_id: generateRequestId(),
    timestamp: new Date().toISOString(),
  };

  if ("retry_after" in def) {
    body.retry_after = def.retry_after;
  }

  return NextResponse.json(body, { status: def.status });
}
