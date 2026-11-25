/**
 * Who built AlgoVerse. Shown in the top bar and on the About page.
 * Fill in `name` and `linkedin` to show the creator card; empty values are hidden.
 */
export const CREATOR = {
  /** Your name as you want it shown, e.g. "Muthu K". */
  name: "",
  /** A short line under the name, e.g. "Software engineer · educator". */
  headline: "",
  /** Full LinkedIn profile URL, e.g. "https://www.linkedin.com/in/your-name/". */
  linkedin: "",
  /** Where the source code lives. */
  github: "https://github.com/SMACAcademy/cl_dsa",
} as const;

export const hasCreator = (): boolean => CREATOR.name.trim() !== "";
