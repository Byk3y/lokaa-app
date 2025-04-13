
// Export all sidebar components from a single entry point
export * from "./sidebar-context";
export * from "./sidebar-core";
export * from "./sidebar-layout";
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
