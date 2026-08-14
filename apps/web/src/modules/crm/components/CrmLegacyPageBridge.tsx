import { ReactNode, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CrmTabs } from "./CrmTabs";

interface CrmLegacyPageBridgeProps {
  children: ReactNode;
}

export function CrmLegacyPageBridge({ children }: CrmLegacyPageBridgeProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const pageContent = document.querySelector("main > div");
    if (!(pageContent instanceof HTMLElement)) return;

    const existing = pageContent.querySelector<HTMLElement>("[data-crm-tabs-host]");
    if (existing) {
      setHost(existing);
      return;
    }

    const container = document.createElement("div");
    container.dataset.crmTabsHost = "true";
    pageContent.prepend(container);
    setHost(container);

    return () => {
      container.remove();
      setHost(null);
    };
  }, []);

  return (
    <>
      {children}
      {host ? createPortal(<CrmTabs />, host) : null}
    </>
  );
}
