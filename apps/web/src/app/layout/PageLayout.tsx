import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePageLayoutTopContent } from "@/components/layout/usePageLayoutTopContent";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  fullHeight?: boolean;
  contentClassName?: string;
  headerActions?: ReactNode;
}

export function PageLayout({ children, fullHeight = false, contentClassName, headerActions }: PageLayoutProps) {
  const topContent = usePageLayoutTopContent();

  return (
    <div className={cn("flex bg-background text-foreground", fullHeight ? "h-screen overflow-hidden" : "min-h-screen")}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header actions={headerActions} />
        <main className={cn("min-w-0 flex-1", fullHeight ? "overflow-hidden" : "overflow-y-auto")}>
          <div
            className={cn(
              "mx-auto w-full px-3.5 py-3.5 sm:px-4 sm:py-4 lg:px-5 xl:px-6",
              fullHeight ? "flex h-full max-w-none flex-col gap-3.5" : "max-w-[1680px] space-y-4",
              contentClassName,
            )}
          >
            {topContent}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
