/**
 * Older-browser fallbacks for the Tailwind v4 output (runs after postcss-preset-env).
 * Modern browsers keep the original CSS; everything added here is either a fallback
 * declaration placed before the modern one, or a rule inside an @supports block that
 * only older browsers match.
 *
 *  1. @property defaults: Tailwind resets its --tw-* variables for browsers without
 *     @property only on old Safari/Firefox. Old Chrome (< 85) needs the same reset.
 *  2. translate / scale / rotate properties (Chrome < 104, Safari < 14.1): add an
 *     equivalent `transform` inside `@supports not (translate: 0)`.
 *  3. inset shorthand (Chrome < 87, Safari < 14.1): expand to top/right/bottom/left.
 *  4. dvh/svh/lvh units (Chrome < 108, Safari < 15.4): add a vh fallback before.
 *  5. :where() (Chrome < 88, Safari < 14): an unwrapped copy for browsers without it.
 */
const TRANSFORM_FALLBACK =
  "translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) rotate(var(--tw-rotate-fb, 0deg)) scale(var(--tw-scale-x, 1), var(--tw-scale-y, 1))";

function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Replace each `:where(a, b)` with its arguments, expanding comma lists into separate selectors. */
function unwhere(selector) {
  const i = selector.indexOf(":where(");
  if (i < 0) return [selector];
  let depth = 0;
  let end = -1;
  for (let j = i + 6; j < selector.length; j++) {
    if (selector[j] === "(") depth++;
    else if (selector[j] === ")") {
      depth--;
      if (depth === 0) {
        end = j;
        break;
      }
    }
  }
  if (end < 0) return [selector];
  const before = selector.slice(0, i);
  const after = selector.slice(end + 1);
  const args = splitTopLevel(selector.slice(i + 7, end), ",");
  return args.flatMap((a) => unwhere(`${before}${a}${after}`));
}

const insideSupports = (node, text) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && p.name === "supports" && p.params.includes(text)) return true;
  return false;
};

module.exports = () => ({
  postcssPlugin: "brokersodo-legacy",
  OnceExit(root, { postcss }) {
    const transformFallbacks = [];
    const whereFallbacks = [];

    // 1. Make Tailwind's @property default reset unconditional (it is the same as the
    //    @property initial values, so modern browsers render exactly as before).
    root.walkAtRules("supports", (at) => {
      if (!at.params.includes("margin-trim")) return;
      const rules = [];
      at.walkRules((r) => {
        // `::backdrop` is unknown to old browsers and would drop the whole rule.
        const sels = r.selectors.filter((s) => !s.includes("::backdrop"));
        if (sels.length) rules.push(r.clone({ selectors: sels }));
      });
      at.replaceWith(rules);
    });

    root.walkRules((rule) => {
      if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;

      // 2. Individual transform properties.
      let usesTransformProps = false;
      const fbDecls = [];
      rule.walkDecls(/^(translate|scale|rotate)$/, (d) => {
        if (insideSupports(d, "translate")) return;
        usesTransformProps = true;
        if (d.prop === "rotate") fbDecls.push(postcss.decl({ prop: "--tw-rotate-fb", value: d.value === "none" ? "0deg" : d.value }));
        else if (!d.value.includes("var(--tw-")) {
          const parts = d.value === "none" ? [] : d.value.split(/\s+/);
          const x = parts[0] ?? (d.prop === "scale" ? "1" : "0");
          const y = parts[1] ?? (d.prop === "scale" ? x : "0");
          fbDecls.push(postcss.decl({ prop: `--tw-${d.prop}-x`, value: x }), postcss.decl({ prop: `--tw-${d.prop}-y`, value: y }));
        }
      });
      if (usesTransformProps && !rule.some((n) => n.type === "decl" && n.prop === "transform")) {
        transformFallbacks.push({ rule, decls: [...fbDecls, postcss.decl({ prop: "transform", value: TRANSFORM_FALLBACK })] });
      }

      // 3. inset shorthand.
      rule.walkDecls("inset", (d) => {
        const v = splitTopLevel(d.value, " ");
        const [t, r = t, b = t, l = r] = v;
        d.cloneBefore({ prop: "top", value: t });
        d.cloneBefore({ prop: "right", value: r });
        d.cloneBefore({ prop: "bottom", value: b });
        d.cloneBefore({ prop: "left", value: l });
      });

      // 4. Dynamic viewport units.
      rule.walkDecls((d) => {
        if (/\d[dsl]vh\b/.test(d.value) && !d.prev()?.value?.endsWith?.("vh")) d.cloneBefore({ value: d.value.replace(/(\d)[dsl]vh\b/g, "$1vh") });
      });

      // 5. :where() selectors.
      if (rule.selector.includes(":where(")) {
        const sels = rule.selectors.flatMap(unwhere).filter((s) => !s.includes(":where("));
        if (sels.length) whereFallbacks.push(rule.clone({ selectors: sels }));
      }
    });

    for (const { rule, decls } of transformFallbacks) {
      const sup = postcss.atRule({ name: "supports", params: "not (translate: 0)" });
      sup.append(postcss.rule({ selectors: rule.selectors, nodes: decls }));
      // Keep the media/supports context of the original rule.
      let wrapper = sup;
      for (let p = rule.parent; p && p.type === "atrule"; p = p.parent) {
        const outer = p.clone({ nodes: [] });
        outer.append(wrapper);
        wrapper = outer;
      }
      rule.root().append(wrapper);
    }
    if (whereFallbacks.length) {
      const sup = postcss.atRule({ name: "supports", params: "not selector(:where(*))" });
      for (const r of whereFallbacks) {
        let wrapper = r;
        for (let p = r.parent ?? null; p && p.type === "atrule"; p = p.parent) {
          const outer = p.clone({ nodes: [] });
          outer.append(wrapper);
          wrapper = outer;
        }
        sup.append(wrapper);
      }
      root.append(sup);
    }
  },
});
module.exports.postcss = true;
