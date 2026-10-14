// Retain fields consumed by creator normalization; omit transcripts, comments,
// recommendations and other large payloads before buffering the full snapshot.
const fields = new Set(`input input_url error url organic channel_url channel_url_decoded profile_url author_url user_profile_url use_url user_posted user_name is_repost repost handle_name youtuber profile_username name title profile_biography description snippet subscribers profile_followers followers avatar_img_channel profile_avatar profile_image_link date_posted create_time caption post_text Name full_name nickname profile_name Description biography about signature profile_pic_url avatar profile_pic_url_hd profile_image location city country_code country is_verified verified Links links external_url external_urls external_link bio_link bio_links websites website email email_address position headline`.split(' '));

export async function readSnapshot(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return 'null';
  const decoder = new TextDecoder();
  let pending = '';
  let bytes = 0;
  let outputBytes = 0;
  let arrayResponse = false;
  let objectResponse = false;
  let control: unknown;
  const records: unknown[] = [];
  const add = (record: unknown) => {
    if (record && typeof record === 'object' && ('snapshot_id' in record || 'status' in record)) {
      control = record;
      return;
    }
    const compact = record && typeof record === 'object' && !Array.isArray(record)
      ? Object.fromEntries(Object.entries(record).filter(([key]) => fields.has(key)))
      : record;
    outputBytes += new TextEncoder().encode(JSON.stringify(compact)).length;
    if (outputBytes > 8_000_000) throw new Error('Snapshot creator data exceeds the download limit.');
    records.push(compact);
  };
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 100_000_000) throw new Error('Snapshot exceeds the download limit.');
      pending += decoder.decode(value, {stream:true});
      if (!records.length && pending.trimStart().startsWith('[')) arrayResponse = true;
      if (!records.length && /^\{\s*\n/.test(pending.trimStart())) objectResponse = true;
      if (arrayResponse || objectResponse) {
        if (pending.length > 8_000_000) throw new Error('Array snapshot exceeds the download limit.');
        continue;
      }
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (line) add(JSON.parse(line));
      }
      if (pending.length > 8_000_000) throw new Error('Snapshot record exceeds the download limit.');
    }
    pending += decoder.decode();
    if (objectResponse) return JSON.stringify(JSON.parse(pending));
    if (arrayResponse) {
      const data = JSON.parse(pending);
      data.forEach(add);
    } else if (pending.trim()) {
      const data = JSON.parse(pending);
      add(data);
    }
    if (control && !records.length) return JSON.stringify(control);
    return JSON.stringify(records);
  } finally {
    await reader.cancel();
  }
}
