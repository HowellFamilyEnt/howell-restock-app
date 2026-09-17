"use client";

// Toggles every native <details> element inside the given container id at
// once - simpler than lifting each area group's open/closed state into
// React, since <details> already tracks that itself; this just reaches
// in and flips all of them together.
export default function ExpandCollapseControls({ containerId }: { containerId: string }) {
  function setAll(open: boolean) {
    const container = document.getElementById(containerId);
    container?.querySelectorAll("details").forEach((el) => {
      el.open = open;
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAll(true)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        Expand all
      </button>
      <button
        type="button"
        onClick={() => setAll(false)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        Collapse all
      </button>
    </div>
  );
}
