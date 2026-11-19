"use client";

import { Bell, Xmark } from "@gravity-ui/icons";
import { Button, Modal, toast } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { markRead } from "@/app/(app)/actions";
import type { NotificationView } from "@/lib/notifications";

/** Re-renders server data every minute while the tab is visible, so new notifications show up. */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

export function NotificationBell({ unread }: { unread: number }) {
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Link
      href="/notifications"
      aria-label={label}
      title="Notifications"
      className="relative grid size-9 place-items-center rounded-md text-white/85 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <Bell aria-hidden className="size-4" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] leading-4 font-bold text-[var(--brand-bar)] tabular-nums">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function useMarkRead() {
  const [pending, startTransition] = useTransition();
  const mark = (ids: number[]) =>
    startTransition(async () => {
      const res = await markRead(ids);
      if (!res.ok) toast.danger(res.message);
    });
  return { pending, mark };
}

/** The newest unread notification, shown under the header until it is read or dismissed. */
export function NotificationBanner({ latest, unread }: { latest: NotificationView; unread: number }) {
  const [open, setOpen] = useState(false);
  const { pending, mark } = useMarkRead();

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span aria-hidden className="bg-accent size-2 shrink-0 rounded-full" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{latest.title}</span>
          <span className="text-muted hidden sm:inline"> · {latest.body}</span>
        </p>
        {unread > 1 && (
          <Link href="/notifications" className="text-muted hidden shrink-0 text-sm hover:underline sm:inline">
            +{unread - 1} more
          </Link>
        )}
        <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
          Read more
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Dismiss"
          isDisabled={pending}
          onPress={() => mark([latest.id])}
        >
          <Xmark aria-hidden />
        </Button>
      </div>

      <Modal.Backdrop
        isOpen={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) mark([latest.id]);
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header className="flex-col items-start gap-1">
              <Modal.Heading>{latest.title}</Modal.Heading>
              <p className="text-muted text-xs">{latest.date}</p>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{latest.body}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" fullWidth>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

/** Marks everything visible in the inbox as read once it has been shown. */
export function MarkAllRead({ ids }: { ids: number[] }) {
  const { mark } = useMarkRead();
  const key = ids.join(",");
  useEffect(() => {
    if (key) mark(key.split(",").map(Number));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per set of ids
  }, [key]);
  return null;
}
