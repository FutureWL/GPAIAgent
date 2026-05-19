import { NextResponse } from 'next/server';

export async function GET() {
  const DEV_API = 'http://localhost:3001';
  const apiUrl = `${DEV_API}/stocks/399001/kline?period=minute&count=120`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json();

    console.log('[TEST] kline data:', JSON.stringify(data).slice(0, 100));
    console.log('[TEST] isArray:', Array.isArray(data));
    console.log('[TEST] length:', data.length);
    console.log('[TEST] period check:', 'minute' in ['minute', '5day', 'day']);

    if (Array.isArray(data) && data.length === 0 && ['minute', '5day', 'day', '1min', '5min', '15min', '30min', '60min'].includes('minute')) {
      console.log('[TEST] FALLBACK CONDITION MET');
      const dbResp = await fetch(`${DEV_API}/stocks/399001/daily?days=120`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      const dbData = await dbResp.json();
      console.log('[TEST] dbData length:', Array.isArray(dbData) ? dbData.length : 'not_array');
      if (Array.isArray(dbData) && dbData.length > 0) {
        return NextResponse.json({ source: 'fallback', count: dbData.length, first: dbData[0] });
      }
    }

    return NextResponse.json({ source: 'original', data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 504 });
  }
}
