// TEMPORARY DIAGNOSTIC — delete this file once the key works.
// Reveals nothing about the key's value, only whether it arrived intact.
export default function handler(req, res) {
  const k = process.env.GEMINI_API_KEY;
  res.status(200).json({
    present: typeof k === "string" && k.length > 0,
    length: k ? k.length : 0,
    trimmedLength: k ? k.trim().length : 0,
    looksLikeGoogleKey: k ? /^AIza[\w-]{30,}$/.test(k.trim()) : false,
    hasQuotes: k ? /^["']|["']$/.test(k) : false,
  });
}
