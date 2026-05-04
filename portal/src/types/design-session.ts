export interface DesignColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface DesignMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DesignSession {
  id: string;
  projectSlug: string;
  brName: string;
  title: string;
  colors: DesignColors;
  messages: DesignMessage[];
  currentHtml: string | null;
  savedAsPng: boolean;
  pngPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSessionSummary {
  id: string;
  title: string;
  savedAsPng: boolean;
  pngPath: string | null;
  updatedAt: string;
}
