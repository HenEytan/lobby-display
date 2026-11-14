// /api/state serves the display from the Blob CDN copy, which can trail a publish by up to 60 s. A
// device that just published (and stored the new stamp) would otherwise pull the previous state back
// and show it for a minute. Times are compared as times: stamps come as ISO "Z" and as Supabase's "+00:00".
export function isOlderStamp(remote, local) {
  const r = Date.parse(remote);
  const l = Date.parse(local);
  return !Number.isNaN(r) && !Number.isNaN(l) && r < l;
}
