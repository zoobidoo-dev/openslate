import { EditorView } from "@codemirror/view";

export function createUploadExtension(onFile: (file: File, view: EditorView) => void) {
  return EditorView.domEventHandlers({
    drop: (event: DragEvent, view) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        event.preventDefault();
        onFile(file, view);
      }
    },
    paste: (event: ClipboardEvent, view) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            onFile(file, view);
            return;
          }
        }
      }
    },
  });
}
