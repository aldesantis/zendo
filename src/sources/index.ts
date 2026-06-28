import gitSource from "./git";
import notionSource from "./notion";

export type SourceResult = {
  status: "success" | "warning";
  message: string;
};

export type Source = (
  destination: string,
  context: { updateProgress: (text: string) => void }
) => Promise<SourceResult>;

export { gitSource, notionSource };
