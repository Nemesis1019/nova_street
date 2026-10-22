const HORDE = 'https://stablehorde.net/api/v2';
const KEY = '0000000000';

const prompt =
  'Full-body editorial photo of a young man wearing a plain solid black oversized t-shirt with dropped shoulders, the t-shirt is black, standing against a raw concrete wall in a city alley, overcast daylight, streetwear lookbook. Photorealistic editorial fashion photography, 35mm lens, natural light, muted palette of cream olive green and black, high detail, authentic skin texture, no text, no logos, no watermark';

async function post(path, body) {
  const res = await fetch(`${HORDE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: KEY,
      'Client-Agent': 'nova-demo:0.0.1:(local)',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function get(path) {
  const res = await fetch(`${HORDE}${path}`, {
    headers: { 'Client-Agent': 'nova-demo:0.0.1:(local)' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  const submit = await post('/generate/async', {
    prompt,
    params: {
      width: 832,
      height: 1216,
      steps: 30,
      cfg_scale: 6,
      sampler_name: 'k_euler_a',
      karras: true,
      nsfw: false,
      censor_nsfw: true,
    },
    models: ['Juggernaut XL', 'AlbedoBase XL 3.1', 'ICBINP - I Cant Believe It Is Not Photography'],
    nsfw: false,
    censor_nsfw: true,
    r2: true,
    shared: false,
  });
  console.log('job:', submit.id, '| kudos:', submit.kudos);

  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const check = await get(`/generate/check/${submit.id}`);
    console.log(`check ${i + 1}: waiting=${check.waiting} done=${check.done} processing=${check.processing} faulted=${check.faulted} queue=${check.queue_position} wait=${check.wait_time}s`);
    if (check.faulted) {
      console.log('FALLÓ:', JSON.stringify(check).slice(0, 300));
      return;
    }
    if (check.done) break;
  }

  const status = await get(`/generate/status/${submit.id}`);
  console.log('generaciones:', status.generations?.length ?? 0);
  console.log('img:', status.generations?.[0]?.img);
}

main().catch((e) => console.error('ERROR:', e.message));
