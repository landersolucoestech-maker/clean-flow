import type { Language } from "../providers/language-context";
import { en } from "./en";
import { pt } from "./pt";
import { es } from "./es";

export const translations: Record<Language, Record<string, string>> = { en, pt, es };
