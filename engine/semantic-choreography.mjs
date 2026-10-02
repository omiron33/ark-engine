/** Sentence-scale choreography. Every pose and mark derives only from source cues
 * and absolute song time. No lyric is generated, retimed or revealed in advance. */
export const SEMANTIC_CATALOG = {
  "split-verdict":
    "A sentence divides into opposing witnesses as its decisive word opens the fault.",
  "falling-weight":
    "Successive clauses land on descending shelves; prior shelves bear their weight.",
  "word-strike":
    "An oversized decisive word transfers impact through the already spoken sentence.",
  "echo-cry":
    "A cry sends typographic pressure echoes outward from its actual sung word.",
  incision:
    "Two interlocking clauses separate along an animated diagonal incision.",
  "balance-offering":
    "Two offerings occupy opposite pans of a cue-driven typographic balance.",
  "refusal-bar":
    "An earlier clause is bracketed by a closing denial rule as the answer arrives below.",
  "fingerprint-mark":
    "A named word becomes the center of a growing, irregular fingerprint topology.",
  "chain-lineage":
    "Names and clauses create a linked, staggered chain in reading order.",
  "branching-seed":
    "An initial phrase grows into alternating typographic branches.",
  "string-pluck":
    "Sung words excite individual strings beneath a musical tiered composition.",
  "forge-assembly":
    "Independent horizontal slices of each word converge into a forged sentence.",
  "tally-vengeance":
    "Each spoken word cuts one tally beside a forceful, offset typographic ledger.",
  "negative-space":
    "The words frame a conspicuous empty center; absence becomes the subject.",
  "threshold-exile":
    "A measured gate opens behind the phrase, which recedes through it after reading.",
  "breath-resolve":
    "The sentence relaxes from a compact human scale into generous white space.",
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, p) => a + (b - a) * p;
const smooth = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
const tau = Math.PI * 2;
const clean = (w) =>
  String(w?.text || "")
    .replace(/[.,]$/, "")
    .toUpperCase();
const ws = (e) =>
  e.s.wordIds.map((id) => e.p.words.find((w) => w.id === id)).filter(Boolean);
const selector = (e) =>
  typeof e.s.direction?.choreography === "string"
    ? e.s.direction.choreography
    : e.s.direction?.choreography?.id;
const tail = (e) => {
  const words = ws(e),
    end = Math.max(e.s.start, ...words.map((w) => w.end));
  return smooth((e.t - end - 0.25) / Math.max(0.5, e.s.end - end - 0.25));
};
const pulse = (w, t, seconds = 0.6) => {
  const age = t - w.start;
  return age < 0
    ? 0
    : Math.sin(clamp(age / seconds) * Math.PI) * Math.exp(-age * 3);
};
const stroke = (c, points, color, width = 1) => {
  if (points.length < 2) return;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
};
const ellipse = (c, x, y, rx, ry, color, width = 1, turn = 0) => {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), turn, 0, tau);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
};
const weightTransfer = (words, t) =>
  words.reduce(
    (sum, w, i) =>
      sum +
      (Math.sin((i + 1) * 1.7) - Math.sin(i * 1.7)) *
        smooth((t - w.start) / 0.65),
    0,
  ) * 8;
const measure = (c, h, text, size, family) => {
  h.setFont(c, size, family);
  return c.measureText(text).width;
};
function chunks(words, n) {
  const result = Array.from({ length: Math.min(n, words.length) }, () => []);
  if (!result.length) return result;
  let target = words.reduce((s, w) => s + w.text.length + 1, 0) / result.length,
    g = 0,
    letters = 0;
  for (const [i, w] of words.entries()) {
    result[g].push(w);
    letters += w.text.length + 1;
    const left = words.length - i - 1,
      groups = result.length - g - 1;
    if (groups && (letters >= target || left === groups)) {
      g++;
      letters = 0;
    }
  }
  return result.filter((g) => g.length);
}
function family(w, e, i) {
  return (
    e.s.direction.fonts?.[w.id] ||
    (i % 3 === 1 ? "Archivo Black" : "Bebas Neue")
  );
}
function row(
  c,
  h,
  e,
  words,
  region,
  { align = "center", size = 150, familyOverride, rotate = 0 } = {},
) {
  const measured = words.map((w, i) => {
      const f = familyOverride || family(w, e, i);
      return { w, family: f, width: measure(c, h, clean(w), 100, f) };
    }),
    base =
      measured.reduce((n, p) => n + p.width, 0) +
      Math.max(0, words.length - 1) * 20;
  const actual = Math.min(
      size,
      region.h * 0.83,
      (region.w / Math.max(1, base)) * 100,
    ),
    width = (base * actual) / 100;
  let x =
    align === "left"
      ? region.x
      : align === "right"
        ? region.x + region.w - width
        : region.x + (region.w - width) / 2;
  return measured.map((p) => {
    const w = (p.width * actual) / 100,
      o = {
        w: p.w,
        x: x + w / 2,
        y: region.y + region.h * 0.55 + actual * 0.28,
        size: actual,
        family: p.family,
        rotate,
        hero: (e.s.direction.heroIds || []).includes(p.w.id),
      };
    x += w + actual * 0.2;
    return o;
  });
}
function boundsOf(c, h, o) {
  return { width: measure(c, h, clean(o.w), o.size, o.family), height: o.size };
}
function safe(c, h, o, box) {
  const { width } = boundsOf(c, h, o),
    margin = 6;
  const maxWidth = Math.max(1, box.w - 2 * margin);
  if (width > maxWidth) o.size *= maxWidth / width;
  const half = (Math.min(width, maxWidth) * Math.abs(o.scale ?? 1)) / 2;
  return {
    ...o,
    x: clamp(o.x, box.x + half + margin, box.x + box.w - half - margin),
    y: clamp(o.y, box.y + o.size * 0.9, box.y + box.h - 8),
  };
}
/** Exported for geometry review; positions retain the exact source word objects. */
export function semanticLayout(c, e, h, layout) {
  const id = selector(e);
  if (!SEMANTIC_CATALOG[id]) return null;
  const d = e.s.direction || {},
    words = ws(e),
    base = layout?.(c, e),
    box = d.textBox || base?.box || { x: 190, y: 210, w: 1540, h: 700 };
  const X = (q) => box.x + box.w * q,
    Y = (q) => box.y + box.h * q,
    region = (x, y, w, ht) => ({
      x: X(x),
      y: Y(y),
      w: box.w * w,
      h: box.h * ht,
    });
  const out = [],
    add = (group, r, opts) => out.push(...row(c, h, e, group, r, opts));
  const groups = chunks(words, 2),
    thirds = chunks(words, 3),
    n = words.length;
  if (id === "split-verdict") {
    add(groups[0] || [], region(0.03, 0.04, 0.72, 0.36), {
      align: "left",
      size: 225,
    });
    add(groups[1] || [], region(0.25, 0.56, 0.72, 0.36), {
      align: "right",
      size: 235,
      familyOverride: "Archivo Black",
    });
  } else if (id === "falling-weight") {
    thirds.forEach((g, i) =>
      add(g, region(0.03 + i * 0.09, 0.04 + i * 0.29, 0.77, 0.26), {
        align: "left",
        size: 160 + i * 22,
        familyOverride: i === 2 ? "Archivo Black" : "Bebas Neue",
      }),
    );
  } else if (id === "word-strike") {
    let hit = words.findIndex((w) => w.id === d.triggerId);
    if (hit < 0) hit = words.findIndex((w) => (d.heroIds || []).includes(w.id));
    if (hit < 0) hit = Math.floor(n / 2);
    const before = words.slice(0, hit),
      decisive = words.slice(hit, hit + 1),
      after = words.slice(hit + 1),
      support = chunks(
        after,
        after.reduce((n, w) => n + w.text.length + 1, 0) > 30 ? 2 : 1,
      );
    add(before, region(0.02, 0.015, 0.79, 0.21), {
      align: "left",
      size: 140,
      familyOverride: "Bebas Neue",
    });
    add(decisive, region(0.06, 0.25, 0.88, after.length ? 0.43 : 0.59), {
      size: 340,
      familyOverride: "Archivo Black",
    });
    support.forEach((g, i) =>
      add(
        g,
        region(
          0.08,
          0.7 + (i * 0.27) / support.length,
          0.9,
          0.26 / support.length,
        ),
        {
          align: "right",
          size: support.length > 1 ? 140 : 185,
          familyOverride: "Bebas Neue",
        },
      ),
    );
  } else if (id === "echo-cry") {
    thirds.forEach((g, i) =>
      add(
        g,
        region(
          i === 1 ? 0.04 : 0.18,
          0.06 + i * 0.27,
          i === 1 ? 0.92 : 0.7,
          0.24,
        ),
        {
          size: i === 1 ? 225 : 150,
          familyOverride: i === 1 ? "Archivo Black" : "Bebas Neue",
        },
      ),
    );
  } else if (id === "incision") {
    add(groups[0] || [], region(0.02, 0.05, 0.76, 0.35), {
      align: "left",
      size: 215,
    });
    add(groups[1] || [], region(0.21, 0.55, 0.77, 0.37), {
      align: "right",
      size: 220,
      familyOverride: "Archivo Black",
    });
  } else if (id === "balance-offering") {
    groups.forEach((group, i) =>
      chunks(group, 2).forEach((g, j) =>
        add(g, region(i ? 0.54 : 0.01, 0.12 + j * 0.31, 0.45, 0.28), {
          size: 190,
          familyOverride: i ? "Archivo Black" : "Bebas Neue",
        }),
      ),
    );
  } else if (id === "refusal-bar") {
    add(groups[0] || [], region(0.05, 0.03, 0.76, 0.3), {
      align: "left",
      size: 155,
    });
    add(groups[1] || [], region(0.2, 0.59, 0.78, 0.32), {
      align: "right",
      size: 225,
      familyOverride: "Archivo Black",
    });
  } else if (id === "fingerprint-mark") {
    let mark = words.findIndex((w) => (d.heroIds || []).includes(w.id));
    if (mark < 0) mark = Math.floor(n / 2);
    add(words.slice(0, mark), region(0.1, 0.01, 0.8, 0.2), { size: 130 });
    add(words.slice(mark, mark + 1), region(0.06, 0.31, 0.88, 0.39), {
      size: 330,
      familyOverride: "Archivo Black",
    });
    add(words.slice(mark + 1), region(0.1, 0.79, 0.8, 0.2), { size: 130 });
  } else if (id === "chain-lineage") {
    const rows = chunks(words, Math.max(2, Math.ceil(n / 4)));
    rows.forEach((group, i) =>
      add(
        group,
        region(
          i % 2 ? 0.16 : 0.01,
          0.01 + (i * 0.9) / rows.length,
          0.81,
          0.8 / rows.length,
        ),
        {
          align: i % 2 ? "right" : "left",
          size: 180,
          familyOverride: i % 2 ? "Archivo Black" : "Bebas Neue",
        },
      ),
    );
  } else if (id === "branching-seed") {
    const root = words.slice(0, Math.min(2, n)),
      branches = chunks(words.slice(root.length), 3);
    add(root, region(0.01, 0.34, 0.35, 0.3), { size: 195 });
    branches.forEach((g, i) =>
      add(g, region(0.46, 0.01 + i * 0.32, 0.53, 0.27), {
        align: "left",
        size: 160,
        familyOverride: i === 1 ? "Archivo Black" : "Bebas Neue",
      }),
    );
  } else if (id === "string-pluck") {
    thirds.forEach((g, i) =>
      add(g, region(0.1 + i * 0.025, 0.035 + i * 0.29, 0.82 - i * 0.05, 0.25), {
        size: 200,
        familyOverride: i === 1 ? "EB Garamond" : "Bebas Neue",
      }),
    );
  } else if (id === "forge-assembly") {
    thirds.forEach((g, i) =>
      add(g, region(i === 1 ? 0.16 : 0.02, 0.04 + i * 0.29, 0.82, 0.25), {
        align: i === 1 ? "right" : "left",
        size: 190,
        familyOverride: i === 1 ? "Bebas Neue" : "Archivo Black",
      }),
    );
  } else if (id === "tally-vengeance") {
    thirds.forEach((g, i) =>
      add(g, region(0.015, 0.025 + i * 0.3, 0.77, 0.27), {
        align: "left",
        size: 210,
        familyOverride: i === 2 ? "Archivo Black" : "Bebas Neue",
      }),
    );
  } else if (id === "negative-space") {
    const bands = chunks(words, 3);
    bands.forEach((g, i) =>
      add(
        g,
        i === 1
          ? region(0.0, 0.43, 0.57, 0.21)
          : region(i === 2 ? 0.31 : 0.02, i === 2 ? 0.76 : 0.02, 0.67, 0.23),
        {
          align: i === 2 ? "right" : "left",
          size: 190,
          familyOverride: i === 1 ? "Archivo Black" : "Bebas Neue",
        },
      ),
    );
  } else if (id === "threshold-exile") {
    thirds.forEach((g, i) =>
      add(g, region(0.17, 0.07 + i * 0.26, 0.66, 0.23), {
        size: 200,
        familyOverride: i === 1 ? "Archivo Black" : "Bebas Neue",
      }),
    );
  } else if (id === "breath-resolve") {
    thirds.forEach((g, i) =>
      add(g, region(0.08, 0.08 + i * 0.27, 0.84, 0.23), {
        size: 180,
        familyOverride: i === 1 ? "EB Garamond" : "Bebas Neue",
      }),
    );
  }
  // Respect a director's explicit protected composition (for example the club
  // strike image's open sky), while preserving this scene's action vocabulary.
  for (const o of out) {
    const authored = d.positions?.[o.w.id];
    if (authored)
      for (const field of ["x", "y", "size", "rotate", "family"])
        if (authored[field] !== undefined) o[field] = authored[field];
  }
  return { id, box, positions: out.map((o) => safe(c, h, o, box)) };
}
function model(c, e, h, layout) {
  const m = semanticLayout(c, e, h, layout);
  if (!m) return null;
  const words = ws(e),
    trigger =
      words.find((w) => w.id === e.s.direction.triggerId) ||
      words.find((w) => (e.s.direction.heroIds || []).includes(w.id)) ||
      words[Math.floor(words.length / 2)];
  return {
    ...m,
    words,
    trigger,
    action: trigger ? ease((e.t - trigger.start) / 0.6) : 0,
    tail: tail(e),
  };
}
/** Word poses expose finite geometry for tests and independent frame analysis. */
export function semanticPoses(c, e, h, layout) {
  const m = model(c, e, h, layout);
  if (!m) return null;
  const { id, box, words, trigger, action, tail: gone } = m,
    cx = box.x + box.w / 2,
    cy = box.y + box.h / 2;
  const poses = m.positions.map((o, i) => {
    const age = e.t - o.w.start,
      enter = ease(age / 0.16),
      read = smooth((e.t - o.w.end - 0.15) / 0.5);
    let x = o.x,
      y = o.y,
      rotate = o.rotate || 0,
      scale = 1,
      opacity = 1;
    if (id === "split-verdict") {
      const side = o.y < cy ? -1 : 1;
      x += side * box.w * 0.045 * action;
      y += side * box.h * 0.035 * action;
    }
    if (id === "falling-weight") {
      y -= 42 * (1 - enter);
      for (const next of words.slice(i + 1)) y += pulse(next, e.t, 0.4) * 9;
    }
    if (id === "word-strike") {
      const shock = trigger ? pulse(trigger, e.t, 0.46) : 0;
      if (o.w.id === trigger?.id) {
        scale = 1 + 0.1 * (1 - enter);
        y -= 15 * (1 - enter);
      } else {
        x += Math.sign(o.x - cx || 1) * shock * 25;
        y += shock * 12;
        rotate += Math.sign(o.x - cx || 1) * shock * 0.015;
      }
    }
    if (id === "echo-cry")
      scale =
        1 +
        0.018 *
          Math.sin(Math.max(0, age) * 4) *
          Math.exp(-Math.max(0, age) * 2);
    if (id === "incision") {
      const side = o.y < cy ? -1 : 1;
      x += side * 38 * action;
      y += side * 18 * action;
      rotate += side * 0.009 * action;
    }
    if (id === "balance-offering") {
      const side = o.x < cx ? -1 : 1;
      const balance = weightTransfer(words, e.t);
      y += side * balance;
      x += side * 12 * (1 - enter);
    }
    if (id === "refusal-bar") {
      if (o.y > cy) x += 36 * (1 - enter);
      else y -= read * action * 16;
    }
    if (id === "fingerprint-mark") {
      if (o.w.id === trigger?.id) scale = 1 + 0.035 * action;
    }
    if (id === "chain-lineage") {
      x -= 22 * (1 - enter);
      y += i % 2 ? 14 * (1 - enter) : -14 * (1 - enter);
    }
    if (id === "branching-seed") {
      const stem = o.x < cx;
      x -= stem ? 12 * (1 - enter) : 36 * (1 - enter);
      y += (o.y - cy) * 0.07 * (1 - enter);
    }
    if (id === "string-pluck") {
      y += age >= 0 ? Math.sin(age * 25) * Math.exp(-age * 5) * 10 : 0;
      rotate += age >= 0 ? Math.sin(age * 25) * Math.exp(-age * 5) * 0.01 : 0;
    }
    if (id === "forge-assembly") {
      y += 12 * (1 - enter);
      scale = 1 - 0.025 * (1 - enter);
    }
    if (id === "tally-vengeance") {
      x -= 28 * (1 - enter);
      scale = 1 + 0.035 * (1 - enter);
    }
    if (id === "negative-space") {
      x += (o.x - cx) * 0.025 * gone;
      y += (o.y - cy) * 0.035 * gone;
    }
    if (id === "threshold-exile") {
      x = mix(x, cx, gone * 0.9);
      y = mix(y, cy + box.h * 0.08, gone * 0.9);
      scale = 1 - gone * 0.82;
      opacity = 1 - gone * 0.78;
    }
    if (id === "breath-resolve") {
      const expansion =
        0.035 * smooth((e.t - e.s.start) / Math.max(0.5, e.s.end - e.s.start));
      x += (x - cx) * expansion;
      y += (y - cy) * expansion;
      scale = 1 - 0.025 * gone;
    }
    return safe(
      c,
      h,
      { ...o, x, y, rotate, scale, opacity, visible: e.t >= o.w.start },
      box,
    );
  });
  return { ...m, positions: poses };
}
/** Quiet supporting geometry. Root owns the photograph and full-frame backdrop. */
export function drawSemanticBackground(c, e, h) {
  const id = selector(e);
  if (!SEMANTIC_CATALOG[id]) return false;
  const d = e.s.direction || {},
    box = d.textBox || { x: 190, y: 210, w: 1540, h: 700 },
    X = (q) => box.x + q * box.w,
    Y = (q) => box.y + q * box.h,
    words = ws(e),
    elapsed = e.t - e.s.start,
    reveal = ease(elapsed / 0.6),
    heard = words.filter((w) => w.start <= e.t),
    latest = heard.at(-1),
    excite = latest ? pulse(latest, e.t) : 0,
    fg = d.light ? e.ink : e.paper;
  c.save();
  c.globalAlpha *= d.photo ? 0.16 : 0.32;
  if (id === "split-verdict") {
    const gap = 20 + heard.length * 6;
    for (const side of [-1, 1])
      stroke(
        c,
        [
          [X(0.5) + side * gap, Y(0.02)],
          [X(0.48) + side * gap, Y(0.45)],
          [X(0.52) + side * gap, Y(0.65)],
          [X(0.5) + side * gap, Y(0.98)],
        ],
        side < 0 ? fg : e.accent,
        2,
      );
  }
  if (id === "falling-weight")
    for (let i = 0; i < 3; i++) {
      const y = Y(0.315 + i * 0.29);
      stroke(
        c,
        [
          [X(0.02 + i * 0.09), y],
          [X(0.83 + i * 0.06), y],
        ],
        i === 2 ? e.accent : fg,
        1.5,
      );
      for (let j = 0; j < 8; j++)
        stroke(
          c,
          [
            [X(0.06 + i * 0.08 + j * 0.08), y + 4],
            [X(0.04 + i * 0.08 + j * 0.08), y + 19],
          ],
          fg,
          0.7,
        );
    }
  if (id === "word-strike") {
    const trigger =
        words.find((w) => w.id === d.triggerId) ||
        words.find((w) => (d.heroIds || []).includes(w.id)) ||
        words[Math.floor(words.length / 2)],
      q = trigger ? ease((e.t - trigger.start) / 0.65) : 0;
    for (let i = 0; i < 12; i++) {
      const a = (i * tau) / 12,
        x = X(0.66) + Math.cos(a) * box.w * 0.2,
        y = Y(0.56) + Math.sin(a) * box.h * 0.35;
      stroke(
        c,
        [
          [x, y],
          [x + Math.cos(a) * q * 80, y + Math.sin(a) * q * 50],
        ],
        i % 3 ? fg : e.accent,
        i % 3 ? 1 : 2,
      );
    }
  }
  if (id === "echo-cry")
    for (let i = 0; i < 7; i++) {
      const z = (elapsed * 0.13 + i / 7) % 1;
      const old = c.globalAlpha;
      c.globalAlpha *= Math.sin(z * Math.PI);
      ellipse(
        c,
        X(0.5),
        Y(0.5),
        box.w * (0.14 + 0.4 * z),
        box.h * (0.1 + 0.5 * z),
        i % 2 ? fg : e.accent,
        0.8,
      );
      c.globalAlpha = old;
    }
  if (id === "incision") {
    const gap = 8 + 26 * reveal;
    for (const side of [-1, 1])
      stroke(
        c,
        [
          [X(0.04), Y(0.7) + side * gap],
          [X(0.96), Y(0.31) + side * gap],
        ],
        side === 1 ? fg : e.accent,
        side === 1 ? 1 : 2,
      );
    for (let i = 0; i < 12; i++)
      stroke(
        c,
        [
          [X(0.1 + i * 0.07), Y(0.66 - i * 0.027)],
          [X(0.115 + i * 0.07), Y(0.67 - i * 0.027)],
        ],
        fg,
        0.8,
      );
  }
  if (id === "balance-offering") {
    const lean = weightTransfer(words, e.t);
    stroke(
      c,
      [
        [X(0.5), Y(0.08)],
        [X(0.5), Y(0.91)],
      ],
      fg,
      1.5,
    );
    stroke(
      c,
      [
        [X(0.16), Y(0.76) - lean],
        [X(0.84), Y(0.76) + lean],
      ],
      e.accent,
      2,
    );
    for (const side of [-1, 1]) {
      const x = X(0.5 + side * 0.26),
        y = Y(0.76) + side * lean;
      stroke(
        c,
        [
          [x - 100, y - 10],
          [x, y + 18],
          [x + 100, y - 10],
        ],
        fg,
        1.8,
      );
    }
    stroke(
      c,
      [
        [X(0.44), Y(0.94)],
        [X(0.5), Y(0.86)],
        [X(0.56), Y(0.94)],
      ],
      fg,
      1.5,
    );
  }
  if (id === "refusal-bar") {
    const p = heard.length / Math.max(1, words.length);
    stroke(
      c,
      [
        [X(0.03), Y(0.39)],
        [X(0.03 + 0.91 * p), Y(0.39)],
      ],
      e.accent,
      6,
    );
    stroke(
      c,
      [
        [X(0.03), Y(0.4)],
        [X(0.03), Y(0.5)],
      ],
      fg,
      2,
    );
    stroke(
      c,
      [
        [X(0.94), Y(0.4)],
        [X(0.94), Y(0.5)],
      ],
      fg,
      2,
    );
  }
  if (id === "fingerprint-mark")
    for (let j = 0; j < 25; j++) {
      const points = [],
        r = 0.05 + j * 0.013;
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * tau * reveal,
          noise = Math.sin(a * 3 + j * 0.12) * 5;
        points.push([
          X(0.5) + Math.cos(a) * (box.w * r + noise),
          Y(0.52) + Math.sin(a) * (box.h * r * 0.85 + noise),
        ]);
      }
      stroke(c, points, j % 6 ? fg : e.accent, j % 6 ? 0.7 : 1.7);
    }
  if (id === "chain-lineage") {
    for (let i = 0; i < heard.length; i++) {
      const q = i / Math.max(1, words.length - 1),
        x = X(0.06 + q * 0.88),
        y = Y(0.5 + Math.sin(q * Math.PI * 3) * 0.35);
      ellipse(c, x, y, 11, 11, e.accent, 1.7);
      if (i) {
        const prev = (i - 1) / Math.max(1, words.length - 1);
        stroke(
          c,
          [
            [
              X(0.06 + prev * 0.88),
              Y(0.5 + Math.sin(prev * Math.PI * 3) * 0.35),
            ],
            [x, y],
          ],
          fg,
          1.1,
        );
      }
    }
  }
  if (id === "branching-seed") {
    stroke(
      c,
      [
        [X(0.38), Y(0.05)],
        [X(0.38), Y(0.96)],
      ],
      fg,
      1.7,
    );
    for (let i = 0; i < 3; i++) {
      const p = ease((elapsed - i * 0.22) / 0.5);
      stroke(
        c,
        [
          [X(0.34), Y(0.5)],
          [X(0.4), Y(0.5 + (i - 1) * 0.31 * p)],
          [X(0.98), Y(0.5 + (i - 1) * 0.31 * p)],
        ],
        i === 1 ? e.accent : fg,
        1.3,
      );
    }
  }
  if (id === "string-pluck") {
    for (let j = 0; j < 17; j++) {
      const x = X(j / 16),
        p = latest
          ? Math.sin((e.t - latest.start) * 29 + j) *
            Math.exp(-Math.max(0, e.t - latest.start) * 4) *
            18
          : 0,
        points = [];
      for (let k = 0; k <= 30; k++) {
        const q = k / 30;
        points.push([x + Math.sin(q * Math.PI) * p, Y(-0.03 + 1.08 * q)]);
      }
      stroke(c, points, j % 4 ? fg : e.accent, j % 4 ? 0.7 : 1.4);
    }
  }
  if (id === "forge-assembly") {
    for (let j = 0; j < 3; j++) {
      const y = Y(0.16 + j * 0.3),
        p = ease((elapsed - j * 0.08) / 0.5);
      stroke(
        c,
        [
          [X(-0.03), y - 32],
          [X(-0.03) + 52 * p, y - 32],
        ],
        e.accent,
        2,
      );
      stroke(
        c,
        [
          [X(1.03), y + 32],
          [X(1.03) - 52 * p, y + 32],
        ],
        fg,
        2,
      );
    }
    for (let j = 0; j < 8; j++) {
      const a = (j * tau) / 8;
      stroke(
        c,
        [
          [
            X(0.5) + Math.cos(a) * box.w * 0.43,
            Y(0.5) + Math.sin(a) * box.h * 0.46,
          ],
          [
            X(0.5) + Math.cos(a) * (box.w * 0.43 + excite * 35),
            Y(0.5) + Math.sin(a) * (box.h * 0.46 + excite * 35),
          ],
        ],
        fg,
        1,
      );
    }
  }
  if (id === "tally-vengeance") {
    for (let i = 0; i < heard.length; i++) {
      const x = X(0.83) + (i % 5) * 19,
        y = Y(0.14) + Math.floor(i / 5) * 105;
      if (i % 5 === 4)
        stroke(
          c,
          [
            [x - 88, y + 48],
            [x + 8, y - 8],
          ],
          e.accent,
          3,
        );
      else
        stroke(
          c,
          [
            [x, y],
            [x - 9, y + 53],
          ],
          fg,
          2,
        );
    }
    stroke(
      c,
      [
        [X(0.805), Y(0.025)],
        [X(0.805), Y(0.91)],
      ],
      e.accent,
      1,
    );
  }
  if (id === "negative-space") {
    const x = X(0.65),
      y = Y(0.48),
      w = box.w * 0.26,
      ht = box.h * 0.32;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      stroke(
        c,
        [
          [x + (sx * w) / 2, y + sy * (ht / 2 - 30 * reveal)],
          [x + (sx * w) / 2, y + (sy * ht) / 2],
          [x + sx * (w / 2 - 55 * reveal), y + (sy * ht) / 2],
        ],
        fg,
        1.6,
      );
  }
  if (id === "threshold-exile") {
    const widen = 0.16 + 0.19 * reveal;
    for (let j = 0; j < 5; j++) {
      const dx = box.w * (widen + j * 0.027),
        dy = j * 11;
      stroke(
        c,
        [
          [X(0.5) - dx, Y(0.97) + dy],
          [X(0.5) - dx, Y(0.015) - dy],
          [X(0.5) + dx, Y(0.015) - dy],
          [X(0.5) + dx, Y(0.97) + dy],
        ],
        j ? fg : e.accent,
        j ? 0.7 : 2,
      );
    }
  }
  if (id === "breath-resolve") {
    for (const side of [-1, 1]) {
      const x = X(0.5) + side * box.w * (0.38 + 0.04 * smooth(elapsed / 4));
      stroke(
        c,
        [
          [x, Y(0.21)],
          [x, Y(0.79)],
        ],
        fg,
        0.8,
      );
      ellipse(c, x, Y(0.5), 3 + reveal * 2, 3 + reveal * 2, e.accent, 1);
    }
    stroke(
      c,
      [
        [X(0.46), Y(0.98)],
        [X(0.54), Y(0.98)],
      ],
      fg,
      0.8,
    );
  }
  c.restore();
  return true;
}
export function drawSemanticTypography(c, e, h, layout) {
  const m = semanticPoses(c, e, h, layout);
  if (!m) return false;
  const { id, box, trigger } = m,
    fg = e.s.direction.light ? e.ink : e.paper;
  c.save();
  if (e.s.direction.photo) {
    c.shadowColor = "rgba(0,0,0,.8)";
    c.shadowBlur = 14;
    c.shadowOffsetY = 3;
  }
  for (const o of m.positions) {
    if (!o.visible) continue;
    const age = e.t - o.w.start,
      opts = {
        family: o.family,
        color: o.hero ? e.accent : fg,
        rotate: o.rotate,
        opacity: o.opacity,
        scale: o.scale,
        motion: "none",
      };
    if (id === "echo-cry" && (o.hero || o.w.id === trigger?.id))
      for (let j = 3; j >= 1; j--) {
        const p = ease(age / (0.6 + j * 0.15));
        h.word(c, o.w, e.t, o.x, o.y + j * 19 * p, o.size, {
          ...opts,
          scale: o.scale + j * 0.028 * p,
          opacity: 0.07 * (1 - p * 0.55),
        });
      }
    if (id === "forge-assembly" && age < 0.22) {
      const width = measure(c, h, clean(o.w), o.size, o.family),
        p = 1 - ease(age / 0.22);
      for (let j = 0; j < 3; j++) {
        c.save();
        c.beginPath();
        c.rect(
          o.x - width / 2 - 55,
          o.y - o.size + (j * o.size) / 3,
          width + 110,
          o.size / 3 + 1,
        );
        c.clip();
        h.word(
          c,
          o.w,
          e.t,
          o.x + (j === 1 ? -1 : 1) * 34 * p,
          o.y,
          o.size,
          opts,
        );
        c.restore();
      }
    } else h.word(c, o.w, e.t, o.x, o.y, o.size, opts);
  }
  c.restore();
  return true;
}
