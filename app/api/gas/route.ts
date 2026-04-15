/**
 * API Proxy untuk Google Apps Script
 * Bypass CORS dengan route server-side
 */

export async function GET(request: Request) {
  try {
    const GAS_ENDPOINT = process.env.NEXT_PUBLIC_GAS_API_ENDPOINT;

    console.log('[API Proxy] GET request, GAS_ENDPOINT:', GAS_ENDPOINT ? 'configured' : 'NOT configured');

    if (!GAS_ENDPOINT) {
      console.error('[API Proxy] GAS_ENDPOINT tidak dikonfigurasi');
      return Response.json(
        { success: false, error: 'GAS endpoint tidak dikonfigurasi di environment' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tipe = searchParams.get('tipe');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const proyek = searchParams.get('proyek');
    const kategori = searchParams.get('kategori');

    // Build GAS URL
    const gasUrl = new URL(GAS_ENDPOINT);
    if (action) gasUrl.searchParams.append('action', action);
    if (tipe) gasUrl.searchParams.append('tipe', tipe);
    if (limit) gasUrl.searchParams.append('limit', limit);
    if (offset) gasUrl.searchParams.append('offset', offset);
    if (proyek) gasUrl.searchParams.append('proyek', proyek);
    if (kategori) gasUrl.searchParams.append('kategori', kategori);

    console.log('[API Proxy] Fetching from:', gasUrl.toString().substring(0, 100) + '...');

    const response = await fetch(gasUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[API Proxy] GAS error response:', response.status, text.substring(0, 200));
      throw new Error(`GAS returned ${response.status}: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[API Proxy] GET error:', message);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const GAS_ENDPOINT = process.env.NEXT_PUBLIC_GAS_API_ENDPOINT;

    if (!GAS_ENDPOINT) {
      return Response.json(
        { success: false, error: 'GAS endpoint tidak dikonfigurasi di environment' },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${GAS_ENDPOINT}?action=submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'submit',
        ...body,
        timestamp: new Date().toISOString(),
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] POST error:', message);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
