export type Language = "typescript" | "python" | "rust" | "go";

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
];
