"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTimezones, withZone } from "@/lib/timezones";
import { cx, inputClass } from "@/components/ui";

/** Lowercase, with "_" and "/" as spaces, so "new york" finds "America/New_York". */
const normalize = (s: string) => s.toLowerCase().replace(/[_/]+/g, " ");

/** A timezone picker you can type into to filter the ~400 IANA zones. */
export function TimezoneSelect({ value, onChange }: { value: string; onChange: (zone: string) => void }) {
  const { zones } = useTimezones();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const all = withZone(zones, value);
    const words = normalize(query).split(" ").filter(Boolean);
    return words.length ? all.filter((tz) => words.every((w) => normalize(tz).includes(w))) : all;
  }, [zones, value, query]);

  function show() {
    setQuery("");
    setActive(Math.max(0, withZone(zones, value).indexOf(value)));
    setOpen(true);
    requestAnimationFrame(() => scrollTo(withZone(zones, value).indexOf(value)));
  }

  function choose(tz: string) {
    onChange(tz);
    setOpen(false);
  }

  function scrollTo(index: number) {
    listRef.current?.children[index]?.scrollIntoView({ block: "nearest" });
  }

  function move(delta: number) {
    if (!open) return show();
    const next = Math.min(Math.max(active + delta, 0), matches.length - 1);
    setActive(next);
    scrollTo(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // pick the zone instead of submitting the form
      if (matches[active]) choose(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        className={cx(inputClass, "pr-8")}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        value={open ? query : value}
        placeholder={open ? value || "Search timezones…" : undefined}
        onFocus={show}
        onClick={() => !open && show()}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          listRef.current?.scrollTo({ top: 0 });
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      <svg
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-slate-500">No timezones match “{query}”</li>}
          {matches.map((tz, i) => (
            <li
              key={tz}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={tz === value}
              className={cx(
                "cursor-pointer px-3 py-1.5",
                i === active ? "bg-indigo-600 text-white" : "text-slate-900",
                tz === value && "font-semibold",
              )}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input so blur doesn't close first
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault(); // inside a <label>: don't re-click the input and reopen the list
                choose(tz);
              }}
            >
              {tz}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
