/**
 * API Proxy untuk Google Apps Script
 * Bypass CORS dengan route server-side
 */

const GAS_ENDPOINT = process.env.NEXT_PUBLIC_GAS_API_ENDPOINT;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tipe = searchParams.get('tipe');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const proyek = searchParams.get('proyek');
    const kategori = searchParams.get('kategori');

    if (!GAS_ENDPOINT) {
      return Response.json(
        { success: false, error: 'GAS endpoint tidak dikonfigurasi' },
        { status: 500 }
      );
    }

    // Build GAS URL
    const gasUrl = new URL(GAS_ENDPOINT);
    if (action) gasUrl.searchParams.append('action', action);
    if (tipe) gasUrl.searchParams.append('tipe', tipe);
    if (limit) gasUrl.searchParams.append('limit', limit);
    if (offset) gasUrl.searchParams.append('offset', offset);
    if (proyek) gasUrl.searchParams.append('proyek', proyek);
    if (kategori) gasUrl.searchParams.append('kategori', kategori);

    const response = await fetch(gasUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`GAS returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] GET error:', message);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!GAS_ENDPOINT) {
      return Response.json(
        { success: false, error: 'GAS endpoint tidak dikonfigurasi' },
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
