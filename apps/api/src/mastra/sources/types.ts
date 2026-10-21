export type Source = {
  slug: string;
  title: string;
  /** 1–2 lines, shown in the prompt index. */
  summary: string;
  tags: string[];
  /** Original web/PDF source when the body is a transcription. */
  url?: string;
  /** Markdown. */
  body: string;
};
