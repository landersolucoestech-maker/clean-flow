import { useContext } from "react";
import { PageLayoutTopContentContext } from "./page-layout-top-content-context";

export function usePageLayoutTopContent() {
  return useContext(PageLayoutTopContentContext);
}
