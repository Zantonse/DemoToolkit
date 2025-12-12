/**
 * Test Connection API Route
 * 
 * POST /api/test-connection
 * 
 * Tests connectivity to an Okta organization by calling the
 * /api/v1/users/me endpoint with provided credentials.
 * 
 * Returns the authenticated user's email if successful.
 * 
 * This endpoint is called from the Settings page when the user
 * clicks "Test Connection".
 */

import { NextResponse } from 'next/server';

interface TestConnectionRequestBody {
  orgUrl?: string;
  apiToken?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestConnectionRequestBody;

    const orgUrl = (body.orgUrl ?? '').trim();
    const apiToken = (body.apiToken ?? '').trim();

    if (!orgUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Org URL and API Token are required.' },
        { status: 400 }
      );
    }

    if (!orgUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Org URL must start with https://.' },
        { status: 400 }
      );
    }

    // Ensure no trailing slash before appending path
    const base = orgUrl.replace(/\/+$/, '');
    const url = `${base}/api/v1/users/me`;

    const oktaRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `SSWS ${apiToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!oktaRes.ok) {
      let message = 'Failed to reach Okta /api/v1/users/me';

      try {
        const errorBody = await oktaRes.json();
        if (errorBody?.errorSummary) {
          message = errorBody.errorSummary;
        }
      } catch {
        // ignore JSON parse errors, keep generic message
      }

      return NextResponse.json(
        {
          error: message,
          status: oktaRes.status,
        },
        { status: 502 }
      );
    }

    const data = await oktaRes.json();

    // Try to derive an email-style identifier
    const email: string | undefined =
      data?.profile?.email ||
      data?.profile?.login ||
      data?.profile?.primaryEmail ||
      undefined;

    return NextResponse.json(
      {
        ok: true,
        email: email ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in /api/test-connection:', error);
    return NextResponse.json(
      {
        error:
          'Unexpected server error while testing Okta connection. Please try again.',
      },
      { status: 500 }
    );
  }
}
