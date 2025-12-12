import { NextRequest, NextResponse } from 'next/server';

type RequestBody = {
  orgUrl?: string;
  apiToken?: string;
};

const normalizeUrl = (url: string) => url.replace(/\/+$/, '');

export async function POST(request: NextRequest) {
  try {
    const { orgUrl, apiToken } = (await request.json()) as RequestBody;

    if (!orgUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Missing orgUrl or apiToken in request body.' },
        { status: 400 }
      );
    }

    const normalized = normalizeUrl(orgUrl);

    const response = await fetch(`${normalized}/api/v1/apps?limit=200`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SSWS ${apiToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      return NextResponse.json(
        { error: payload?.errorSummary || 'Failed to list apps.' },
        { status: response.status }
      );
    }

    const apps = await response.json();
    return NextResponse.json({ apps });
  } catch (error: any) {
    console.error('Proxy apps error', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
