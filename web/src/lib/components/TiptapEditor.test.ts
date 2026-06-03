import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import TiptapEditor from "./TiptapEditor.svelte";

const baseProps = {
  content: "",
  noteId: "",
  insertMediaMd: "",
  insertMediaKey: 0,
};

// These run under jsdom (see vite.config.ts) with a few ProseMirror DOM
// polyfills in src/test-setup.ts. Full Tiptap editing behaviour needs a real
// browser, so these are smoke tests: they verify the component mounts and
// reflects its `content` prop without crashing.

describe("TiptapEditor", () => {
  it("mounts and renders the editor container", () => {
    render(TiptapEditor, { ...baseProps });

    const editorEl = document.querySelector(".tiptap-editor");
    expect(editorEl).toBeTruthy();
  });

  it("renders initial content into the editor", () => {
    render(TiptapEditor, { ...baseProps, content: "# Hello world" });

    // ProseMirror renders into a contenteditable area inside the container.
    const editable = document.querySelector(".tiptap-editor [contenteditable]");
    expect(editable).toBeTruthy();
    expect(editable?.textContent).toContain("Hello world");
  });

  it("responds to content prop changes", async () => {
    const { rerender } = render(TiptapEditor, {
      ...baseProps,
      content: "first version",
    });

    const editable = document.querySelector(".tiptap-editor [contenteditable]");
    expect(editable?.textContent).toContain("first version");

    await rerender({ ...baseProps, content: "second version" });

    await waitFor(() => {
      expect(editable?.textContent).toContain("second version");
      expect(editable?.textContent).not.toContain("first version");
    });
  });

  it("does not call onContentChange while applying external content", () => {
    const onContentChange = vi.fn();

    render(TiptapEditor, {
      ...baseProps,
      content: "external content",
      onContentChange,
    });

    // Initial content is applied programmatically, which must not be reported
    // back as a user edit (the component guards this with `updatingContent`).
    expect(onContentChange).not.toHaveBeenCalled();
  });
});
