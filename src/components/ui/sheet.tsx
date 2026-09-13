import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  side = "bottom",
  title,
  ...props
}: ComponentProps<typeof Dialog.Content> & {
  side?: "bottom" | "right";
  title: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70 data-[state=open]:animate-in" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 bg-surface border-border shadow-panel focus:outline-none",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl border-t",
          side === "right" &&
            "inset-y-0 right-0 h-full w-full max-w-md border-l",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <Dialog.Title className="text-sm font-medium text-fg">
            {title}
          </Dialog.Title>
          <Dialog.Close
            className="inline-flex size-10 items-center justify-center rounded-sm text-muted hover:text-fg hover:bg-elevated"
            aria-label="Close"
          >
            <X className="size-4" />
          </Dialog.Close>
        </div>
        <div
          className={
            side === "right"
              ? "overflow-y-auto h-[calc(100dvh-52px)]"
              : "overflow-y-auto max-h-[calc(88dvh-52px)]"
          }
        >
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
