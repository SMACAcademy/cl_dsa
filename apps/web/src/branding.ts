/**
 * Who built AlgoVerse. Shown quietly in the footer of every page and on the About page.
 * Empty values are hidden.
 */
export const CREATOR = {
  /** Your name as you want it shown. */
  name: "Muthukumar Subramanian",
  /** A short line under the name. */
  headline: "Agentic AI & GenAI Architect · Fractional Executive · Mentor",
  /** One or two sentences on what you do. */
  summary:
    "I help enterprises take AI agents from proof of concept to production, reliably, on secure, cloud-native platforms: architecture and production-readiness reviews, turning ideas into running systems, and mentoring the engineers who build them. AlgoVerse is one example: a complete learning platform designed and built with AI.",
  /** What you work on, shown as small tags. */
  focus: ["AI agents & RAG / GraphRAG", "Kubernetes & DevSecOps", "Training & mentoring"],
  /** A short credentials line. */
  credentials: "25 years in technology · Ex-CTO, Pente AI · Founder, SMAC Academy",
  /** Full LinkedIn profile URL, e.g. "https://www.linkedin.com/in/your-name/". */
  linkedin: "",
  /** Where the source code lives. */
  github: "https://github.com/SMACAcademy/cl_dsa",
} as const;

export const hasCreator = (): boolean => CREATOR.name.trim() !== "";
