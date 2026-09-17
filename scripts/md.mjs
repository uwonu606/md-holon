// check.mjs 와 open.mjs 가 같이 쓰는 markdown 읽기. 문법은 docs/agents/digest-format.md.

// frontmatter → { fields: {k: v}, keys: [k], body, errors: [why] }. 실패는 부르는 쪽이 step 을 달아 올린다.
export function splitFront(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return { fields: {}, keys: [], body: text, errors: ["frontmatter must start at line 1 with ---"] };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { fields: {}, keys: [], body: text, errors: ["frontmatter is not closed"] };
  const fields = {};
  const keys = [];
  const errors = [];
  for (const l of lines.slice(1, end)) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(l);
    if (!m) {
      errors.push(`frontmatter line is not "key: value": ${l}`);
      continue;
    }
    fields[m[1]] = m[2].trim();
    keys.push(m[1]);
  }
  return { fields, keys, body: lines.slice(end + 1).join("\n"), errors };
}

// "## 제목" 절 → Map(제목 → 줄들)
export function sections(body) {
  const out = new Map();
  let cur = null;
  for (const l of body.split("\n")) {
    const m = /^## (.+)$/.exec(l);
    if (m) {
      cur = [];
      out.set(m[1].trim(), cur);
    } else if (cur) cur.push(l);
  }
  return out;
}

// markdown 표 → 칸을 trim 한 행들(머리와 구분선은 뺀다)
export function table(lines) {
  const rows = lines.filter((l) => l.startsWith("|"));
  return rows.slice(2).map((l) => l.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
}

export function tableHeader(lines) {
  const h = lines.find((l) => l.startsWith("|"));
  return h ? h.slice(1).replace(/\|\s*$/, "").split("|").map((c) => c.trim()) : null;
}
