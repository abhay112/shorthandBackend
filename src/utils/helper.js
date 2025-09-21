export function normalizeIds(arr = []) {
  return arr
    .map((v) => {
      if (!v && v !== 0) return null;
      // mongoose ObjectId
      if (typeof v === 'object' && v._id) return String(v._id);
      // if v is an object with id field
      if (typeof v === 'object' && v.id) return String(v.id);
      // if v is an object that looks like ObjectId (toStringable)
      if (typeof v === 'object' && typeof v.toString === 'function') {
        // avoid producing '[object Object]'
        const s = v.toString();
        // If toString produced '[object Object]' treat as invalid
        if (s === '[object Object]') return null;
        return s;
      }
      // primitive string or number
      return String(v);
    })
    .filter(Boolean); // remove null/undefined/empty
}