/**
 * Who built AlgoVerse. Shown quietly in the footer of every page and on the About page.
 * Empty values are hidden.
 */
export const CREATOR = {
  /** Your name as you want it shown. */
  name: "Muthukumar Subramanian",
  /** A short line under the name, e.g. "Software engineer · educator". */
  headline: "",
  /** Full LinkedIn profile URL, e.g. "https://www.linkedin.com/in/your-name/". */
  linkedin: "",
  /** Where the source code lives. */
  github: "https://github.com/SMACAcademy/cl_dsa",
} as const;

export const hasCreator = (): boolean => CREATOR.name.trim() !== "";
