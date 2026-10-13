"use client";

import { useEffect } from "react";
import { scanAll } from "@/components/site/runtime";

/** Rendered last inside every page: binds interactions only after this page's markup has hydrated. */
export default function PageReady() {
  useEffect(() => { scanAll(document.body); }, []);
  return null;
}
