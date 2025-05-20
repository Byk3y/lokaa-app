// Export all sidebar components from a single entry point
// eslint-disable-next-line react-refresh/only-export-components
export * from "./sidebar-context";
// eslint-disable-next-line react-refresh/only-export-components
export * from "./sidebar-core";
// eslint-disable-next-line react-refresh/only-export-components
export * from "./sidebar-layout";
// eslint-disable-next-line react-refresh/only-export-components
export * from "./sidebar-menu";

// Re-export for backwards compatibility
import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  SidebarProvider as InternalSidebarProvider,
  type SidebarContext 
} from "./sidebar-context";

// Wrap SidebarProvider with TooltipProvider for backwards compatibility
const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof InternalSidebarProvider>
>((props, ref) => (
  <TooltipProvider delayDuration={0}>
    <InternalSidebarProvider 
      ref={ref} 
      className="group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar"
      {...props} 
    />
  </TooltipProvider>
));

SidebarProvider.displayName = "SidebarProvider";

export { SidebarProvider };
