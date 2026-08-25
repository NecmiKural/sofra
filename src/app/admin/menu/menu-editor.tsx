"use client";

import { useMemo, useState } from "react";
import { packJson, tj, TAGS } from "@/lib/i18n";
import { formatMoney, toMinor } from "@/lib/money";

type Cat = { id: string; parentId: string | null; nameJson: string; sort: number };
type Choice = { id?: string; nameJson: string; priceDelta: number; priceAbsolute: number | null };
type Group = { id?: string; nameJson: string; type: string; required: boolean; choices: Choice[] };
type Item = {
  id: string;
  categoryId: string;
  nameJson: string;
  descJson: string;
  priceMinor: number;
  emoji: string | null;
  imageUrl: string | null;
  prepMinutes: number | null;
  tags: string;
  available: boolean;
  sort: number;
  optionGroups: Group[];
};

type LangMap = Record<string, string>;
type DraftChoice = { names: LangMap; delta: string; absolute: string };
type DraftGroup = { names: LangMap; type: string; required: boolean; choices: DraftChoice[] };
type Draft = {
  id?: string;
  categoryId: string;
  names: LangMap;
  descs: LangMap;
  price: string;
  emoji: string;
  imageUrl: string;
  prepMinutes: string;
  tags: string[];
  available: boolean;
  groups: DraftGroup[];
};

const TAG_LABELS: Record<string, string> = {
  popular: "★ Popular",
  vegetarian: "🌿 Vegetarian",
  vegan: "🌱 Vegan",
  spicy: "🌶 Spicy",
  glutenfree: "🌾 Gluten-free",
};

function unpack(json: string, languages: string[]): LangMap {
  const out: LangMap = {};
  try {
    const obj = JSON.parse(json) as LangMap;
    for (const l of languages) out[l] = obj[l] ?? "";
  } catch {
    for (const l of languages) out[l] = "";
  }
  return out;
}

export default function MenuEditor({
  initialCategories,
  initialItems,
  languages,
  currency,
  defaultLang,
}: {
  initialCategories: Cat[];
  initialItems: Item[];
  languages: string[];
  currency: string;
  defaultLang: string;
}) {
  const [cats, setCats] = useState<Cat[]>(initialCategories);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedCat, setSelectedCat] = useState<string | null>(initialCategories.find((c) => !c.parentId)?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catDraft, setCatDraft] = useState<{ parentId: string | null; names: LangMap } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; names: LangMap } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [cRes, iRes] = await Promise.all([fetch("/api/categories"), fetch("/api/items")]);
    if (cRes.ok) setCats(await cRes.json());
    if (iRes.ok) setItems(await iRes.json());
  };

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) alert("Request failed");
      await reload();
      return res.ok;
    } finally {
      setBusy(false);
    }
  };

  /* -------- categories -------- */

  const topCats = useMemo(() => cats.filter((c) => !c.parentId).sort((a, b) => a.sort - b.sort), [cats]);
  const childrenOf = (id: string) => cats.filter((c) => c.parentId === id).sort((a, b) => a.sort - b.sort);
  const itemsOf = (catId: string) => items.filter((i) => i.categoryId === catId).sort((a, b) => a.sort - b.sort);

  const saveNewCategory = async () => {
    if (!catDraft) return;
    const nameJson = packJson(catDraft.names);
    if (nameJson === "{}") return alert("Give the category a name.");
    await api("/api/categories", "POST", { nameJson, parentId: catDraft.parentId });
    setCatDraft(null);
  };

  const saveRename = async () => {
    if (!renaming) return;
    await api(`/api/categories/${renaming.id}`, "PATCH", { nameJson: packJson(renaming.names) });
    setRenaming(null);
  };

  const moveCat = async (cat: Cat, dir: -1 | 1) => {
    const siblings = cats.filter((c) => c.parentId === cat.parentId).sort((a, b) => a.sort - b.sort);
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const other = siblings[idx + dir];
    if (!other) return;
    await Promise.all([
      fetch(`/api/categories/${cat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort: other.sort }) }),
      fetch(`/api/categories/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort: cat.sort }) }),
    ]);
    await reload();
  };

  const deleteCat = async (cat: Cat) => {
    const count = itemsOf(cat.id).length + childrenOf(cat.id).length;
    if (!confirm(`Delete "${tj(cat.nameJson, defaultLang)}"${count ? ` and everything in it (${count})` : ""}?`)) return;
    await api(`/api/categories/${cat.id}`, "DELETE");
    if (selectedCat === cat.id) setSelectedCat(null);
  };

  /* -------- items -------- */

  const emptyDraft = (categoryId: string): Draft => ({
    categoryId,
    names: Object.fromEntries(languages.map((l) => [l, ""])),
    descs: Object.fromEntries(languages.map((l) => [l, ""])),
    price: "",
    emoji: "",
    imageUrl: "",
    prepMinutes: "",
    tags: [],
    available: true,
    groups: [],
  });

  const toDraft = (it: Item): Draft => ({
    id: it.id,
    categoryId: it.categoryId,
    names: unpack(it.nameJson, languages),
    descs: unpack(it.descJson, languages),
    price: (it.priceMinor / 100).toString(),
    emoji: it.emoji ?? "",
    imageUrl: it.imageUrl ?? "",
    prepMinutes: it.prepMinutes?.toString() ?? "",
    tags: it.tags ? it.tags.split(",").filter(Boolean) : [],
    available: it.available,
    groups: it.optionGroups.map((g) => ({
      names: unpack(g.nameJson, languages),
      type: g.type,
      required: g.required,
      choices: g.choices.map((c) => ({
        names: unpack(c.nameJson, languages),
        delta: c.priceDelta ? (c.priceDelta / 100).toString() : "",
        absolute: c.priceAbsolute != null ? (c.priceAbsolute / 100).toString() : "",
      })),
    })),
  });

  const saveDraft = async () => {
    if (!draft) return;
    const nameJson = packJson(draft.names);
    if (nameJson === "{}") return alert("Give the item a name.");
    if (!draft.price) return alert("Set a price.");
    const payload = {
      categoryId: draft.categoryId,
      nameJson,
      descJson: packJson(draft.descs),
      priceMinor: toMinor(draft.price),
      emoji: draft.emoji || null,
      imageUrl: draft.imageUrl || null,
      prepMinutes: draft.prepMinutes ? parseInt(draft.prepMinutes, 10) || null : null,
      tags: draft.tags.join(","),
      available: draft.available,
      optionGroups: draft.groups
        .filter((g) => packJson(g.names) !== "{}")
        .map((g) => ({
          nameJson: packJson(g.names),
          type: g.type,
          required: g.required,
          choices: g.choices
            .filter((c) => packJson(c.names) !== "{}")
            .map((c) => ({
              nameJson: packJson(c.names),
              priceDelta: c.delta ? toMinor(c.delta) : 0,
              priceAbsolute: c.absolute ? toMinor(c.absolute) : null,
            })),
        })),
    };
    const ok = draft.id ? await api(`/api/items/${draft.id}`, "PATCH", payload) : await api("/api/items", "POST", payload);
    if (ok) setDraft(null);
  };

  const moveItem = async (it: Item, dir: -1 | 1) => {
    const siblings = itemsOf(it.categoryId);
    const idx = siblings.findIndex((x) => x.id === it.id);
    const other = siblings[idx + dir];
    if (!other) return;
    await Promise.all([
      fetch(`/api/items/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort: other.sort }) }),
      fetch(`/api/items/${other.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort: it.sort }) }),
    ]);
    await reload();
  };

  const selected = cats.find((c) => c.id === selectedCat) ?? null;
  const visibleCatIds = selected ? [selected.id, ...childrenOf(selected.id).map((c) => c.id)] : [];

  /* -------- render -------- */

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        {busy && <span className="text-sm muted pulse-soft">Saving…</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Category tree */}
        <aside className="space-y-2">
          {topCats.map((cat) => (
            <div key={cat.id}>
              <CatRow
                cat={cat}
                active={selectedCat === cat.id}
                lang={defaultLang}
                count={itemsOf(cat.id).length}
                onSelect={() => setSelectedCat(cat.id)}
                onRename={() => setRenaming({ id: cat.id, names: unpack(cat.nameJson, languages) })}
                onDelete={() => deleteCat(cat)}
                onMove={(d) => moveCat(cat, d)}
              />
              {childrenOf(cat.id).map((sub) => (
                <div key={sub.id} className="ml-5 mt-1">
                  <CatRow
                    cat={sub}
                    active={selectedCat === sub.id}
                    lang={defaultLang}
                    count={itemsOf(sub.id).length}
                    onSelect={() => setSelectedCat(sub.id)}
                    onRename={() => setRenaming({ id: sub.id, names: unpack(sub.nameJson, languages) })}
                    onDelete={() => deleteCat(sub)}
                    onMove={(d) => moveCat(sub, d)}
                  />
                </div>
              ))}
              {selectedCat === cat.id && (
                <button onClick={() => setCatDraft({ parentId: cat.id, names: {} })} className="ml-5 mt-1 text-xs muted underline">
                  + subcategory
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setCatDraft({ parentId: null, names: {} })} className="btn-ghost w-full px-3 py-2 text-sm">
            + Add category
          </button>
        </aside>

        {/* Items */}
        <section>
          {!selected ? (
            <p className="card p-6 muted">Select or create a category to manage its items.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{tj(selected.nameJson, defaultLang)}</h2>
                <button onClick={() => setDraft(emptyDraft(selected.id))} className="btn-primary px-4 py-2 text-sm">
                  + Add item
                </button>
              </div>
              {visibleCatIds.map((catId) => {
                const cat = cats.find((c) => c.id === catId)!;
                const list = itemsOf(catId);
                return (
                  <div key={catId} className="mb-5">
                    {catId !== selected.id && <h3 className="mb-2 text-sm font-semibold muted">{tj(cat.nameJson, defaultLang)}</h3>}
                    <div className="space-y-2">
                      {list.length === 0 && <p className="text-sm muted">No items yet.</p>}
                      {list.map((it) => (
                        <div key={it.id} className={`card flex items-center gap-3 p-3 ${it.available ? "" : "opacity-50"}`}>
                          <span className="text-2xl">{it.emoji || "🍽️"}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{tj(it.nameJson, defaultLang)}</div>
                            <div className="text-xs muted">
                              {formatMoney(it.priceMinor, currency, defaultLang)}
                              {it.optionGroups.length > 0 && ` · ${it.optionGroups.length} option group(s)`}
                              {it.tags && ` · ${it.tags}`}
                            </div>
                          </div>
                          <label className="flex items-center gap-1 text-xs muted">
                            <input
                              type="checkbox"
                              checked={it.available}
                              onChange={(e) => api(`/api/items/${it.id}`, "PATCH", { available: e.target.checked })}
                            />
                            on
                          </label>
                          <button onClick={() => moveItem(it, -1)} className="chip px-2 py-1 text-xs">↑</button>
                          <button onClick={() => moveItem(it, 1)} className="chip px-2 py-1 text-xs">↓</button>
                          <button onClick={() => setDraft(toDraft(it))} className="chip px-2.5 py-1 text-sm">✎</button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete "${tj(it.nameJson, defaultLang)}"?`)) await api(`/api/items/${it.id}`, "DELETE");
                            }}
                            className="chip px-2.5 py-1 text-sm"
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </div>

      {/* New category modal */}
      {catDraft && (
        <Modal title={catDraft.parentId ? "New subcategory" : "New category"} onClose={() => setCatDraft(null)}>
          {languages.map((l) => (
            <label key={l} className="mb-2 block text-sm">
              <span className="muted uppercase">{l}</span>
              <input
                className="input mt-1"
                value={catDraft.names[l] ?? ""}
                onChange={(e) => setCatDraft({ ...catDraft, names: { ...catDraft.names, [l]: e.target.value } })}
              />
            </label>
          ))}
          <button onClick={saveNewCategory} className="btn-primary mt-2 w-full px-4 py-2.5">Save</button>
        </Modal>
      )}

      {/* Rename modal */}
      {renaming && (
        <Modal title="Rename category" onClose={() => setRenaming(null)}>
          {languages.map((l) => (
            <label key={l} className="mb-2 block text-sm">
              <span className="muted uppercase">{l}</span>
              <input
                className="input mt-1"
                value={renaming.names[l] ?? ""}
                onChange={(e) => setRenaming({ ...renaming, names: { ...renaming.names, [l]: e.target.value } })}
              />
            </label>
          ))}
          <button onClick={saveRename} className="btn-primary mt-2 w-full px-4 py-2.5">Save</button>
        </Modal>
      )}

      {/* Item editor modal */}
      {draft && (
        <Modal title={draft.id ? "Edit item" : "New item"} onClose={() => setDraft(null)} wide>
          <ItemForm draft={draft} setDraft={setDraft} languages={languages} cats={cats} defaultLang={defaultLang} />
          <button onClick={saveDraft} disabled={busy} className="btn-primary mt-4 w-full px-4 py-3">Save item</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function CatRow({
  cat, active, lang, count, onSelect, onRename, onDelete, onMove,
}: {
  cat: Cat; active: boolean; lang: string; count: number;
  onSelect: () => void; onRename: () => void; onDelete: () => void; onMove: (d: -1 | 1) => void;
}) {
  return (
    <div className={`card flex items-center gap-1 px-3 py-2 ${active ? "" : ""}`} style={active ? { borderColor: "var(--venue-primary)" } : undefined}>
      <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-sm font-medium">
        {tj(cat.nameJson, lang)} <span className="muted">({count})</span>
      </button>
      <button onClick={() => onMove(-1)} className="px-1 text-xs muted">↑</button>
      <button onClick={() => onMove(1)} className="px-1 text-xs muted">↓</button>
      <button onClick={onRename} className="px-1 text-xs muted">✎</button>
      <button onClick={onDelete} className="px-1 text-xs muted">🗑</button>
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl p-5 ${wide ? "max-w-2xl" : "max-w-sm"}`}
        style={{ background: "var(--bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="chip px-3 py-1 text-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ItemForm({
  draft, setDraft, languages, cats, defaultLang,
}: {
  draft: Draft; setDraft: (d: Draft) => void; languages: string[]; cats: Cat[]; defaultLang: string;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {languages.map((l) => (
          <label key={l} className="block text-sm">
            <span className="muted">Name ({l.toUpperCase()})</span>
            <input className="input mt-1" value={draft.names[l] ?? ""} onChange={(e) => set({ names: { ...draft.names, [l]: e.target.value } })} />
          </label>
        ))}
        {languages.map((l) => (
          <label key={l} className="block text-sm">
            <span className="muted">Description ({l.toUpperCase()})</span>
            <input className="input mt-1" value={draft.descs[l] ?? ""} onChange={(e) => set({ descs: { ...draft.descs, [l]: e.target.value } })} />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="muted">Price</span>
          <input className="input mt-1" inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="muted">Emoji</span>
          <input className="input mt-1" value={draft.emoji} onChange={(e) => set({ emoji: e.target.value })} placeholder="🍕" />
        </label>
        <label className="block text-sm">
          <span className="muted">Prep (min)</span>
          <input className="input mt-1" inputMode="numeric" value={draft.prepMinutes} onChange={(e) => set({ prepMinutes: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="muted">Category</span>
          <select className="input mt-1" value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "— " : ""}{tj(c.nameJson, defaultLang)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="muted">Image URL (optional, emoji is used otherwise)</span>
        <input className="input mt-1" value={draft.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
      </label>

      <div className="flex flex-wrap gap-2 text-sm">
        {TAGS.map((tag) => (
          <label key={tag} className={`chip cursor-pointer px-3 py-1 ${draft.tags.includes(tag) ? "active" : ""}`}>
            <input
              type="checkbox"
              className="hidden"
              checked={draft.tags.includes(tag)}
              onChange={(e) => set({ tags: e.target.checked ? [...draft.tags, tag] : draft.tags.filter((x) => x !== tag) })}
            />
            {TAG_LABELS[tag]}
          </label>
        ))}
        <label className="chip cursor-pointer px-3 py-1">
          <input type="checkbox" checked={draft.available} onChange={(e) => set({ available: e.target.checked })} /> available
        </label>
      </div>

      {/* Option groups */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Option groups</h3>
          <button
            onClick={() => set({ groups: [...draft.groups, { names: {}, type: "single", required: false, choices: [{ names: {}, delta: "", absolute: "" }] }] })}
            className="chip px-3 py-1 text-sm"
          >
            + group
          </button>
        </div>
        <p className="mt-1 text-xs muted">
          e.g. “Portion” (single choice, absolute prices) or “Extras” (multi choice, +price).
        </p>
        {draft.groups.map((g, gi) => (
          <div key={gi} className="card mt-3 p-3">
            <div className="flex flex-wrap items-end gap-2">
              {languages.map((l) => (
                <label key={l} className="block flex-1 text-xs">
                  <span className="muted">Group name ({l.toUpperCase()})</span>
                  <input
                    className="input mt-1"
                    value={g.names[l] ?? ""}
                    onChange={(e) => {
                      const groups = [...draft.groups];
                      groups[gi] = { ...g, names: { ...g.names, [l]: e.target.value } };
                      set({ groups });
                    }}
                  />
                </label>
              ))}
              <select
                className="input w-28"
                value={g.type}
                onChange={(e) => {
                  const groups = [...draft.groups];
                  groups[gi] = { ...g, type: e.target.value };
                  set({ groups });
                }}
              >
                <option value="single">single</option>
                <option value="multi">multi</option>
              </select>
              <button
                onClick={() => set({ groups: draft.groups.filter((_, i) => i !== gi) })}
                className="chip px-2 py-1.5 text-sm"
              >
                🗑
              </button>
            </div>

            {g.choices.map((c, ci) => (
              <div key={ci} className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2 line">
                {languages.map((l) => (
                  <label key={l} className="block flex-1 text-xs">
                    <span className="muted">Choice ({l.toUpperCase()})</span>
                    <input
                      className="input mt-1"
                      value={c.names[l] ?? ""}
                      onChange={(e) => {
                        const groups = [...draft.groups];
                        const choices = [...g.choices];
                        choices[ci] = { ...c, names: { ...c.names, [l]: e.target.value } };
                        groups[gi] = { ...g, choices };
                        set({ groups });
                      }}
                    />
                  </label>
                ))}
                <label className="block w-20 text-xs">
                  <span className="muted">+price</span>
                  <input
                    className="input mt-1"
                    inputMode="decimal"
                    value={c.delta}
                    onChange={(e) => {
                      const groups = [...draft.groups];
                      const choices = [...g.choices];
                      choices[ci] = { ...c, delta: e.target.value };
                      groups[gi] = { ...g, choices };
                      set({ groups });
                    }}
                  />
                </label>
                <label className="block w-20 text-xs">
                  <span className="muted">=price</span>
                  <input
                    className="input mt-1"
                    inputMode="decimal"
                    value={c.absolute}
                    onChange={(e) => {
                      const groups = [...draft.groups];
                      const choices = [...g.choices];
                      choices[ci] = { ...c, absolute: e.target.value };
                      groups[gi] = { ...g, choices };
                      set({ groups });
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    const groups = [...draft.groups];
                    groups[gi] = { ...g, choices: g.choices.filter((_, i) => i !== ci) };
                    set({ groups });
                  }}
                  className="chip px-2 py-1.5 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const groups = [...draft.groups];
                groups[gi] = { ...g, choices: [...g.choices, { names: {}, delta: "", absolute: "" }] };
                set({ groups });
              }}
              className="mt-2 text-xs muted underline"
            >
              + choice
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
