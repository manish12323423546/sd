export type Lang = "gu" | "en";
export interface Translator {
  translate(text: string, lang: Lang): string;
  toGu(key: string): string | null;
  toEn(key: string): string | null;
  norm(s: string): string;
}
export function createTranslator(dict: { exact: Record<string, string>; months: Record<string, string> }): Translator;
export function norm(s: string): string;
