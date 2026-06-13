import { keymap } from "@codemirror/view";

export function createModeToggleKeymap(onToggle: () => void) {
  return keymap.of([
    {
      key: "Ctrl-Shift-m",
      run: () => {
        onToggle();
        return true;
      },
    },
    {
      key: "Ctrl-\\",
      run: () => {
        onToggle();
        return true;
      },
    },
  ]);
}
