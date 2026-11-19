"use client";

import {
  AlertDialog,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/auth-ui";

type Result = { ok: true } | { ok: false; message: string };
type ButtonVariant = "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger" | "danger-soft";

/* ------------------------------------------------------------------ confirm */

export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel = "Delete",
  successMessage,
  onConfirm,
  variant = "danger-soft",
  size = "sm",
  icon,
  iconOnly = false,
}: {
  label: string;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  successMessage: string;
  onConfirm: () => Promise<Result>;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await onConfirm();
      if (res.ok) {
        toast.success(successMessage);
        setOpen(false);
      } else {
        toast.danger(res.message);
      }
    });
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        isIconOnly={iconOnly}
        aria-label={iconOnly ? label : undefined}
        onPress={() => setOpen(true)}
      >
        {icon}
        {!iconOnly && label}
      </Button>
      <AlertDialog.Backdrop isOpen={open} onOpenChange={setOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-md">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <div className="text-sm leading-relaxed">{body}</div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" isPending={pending} onPress={confirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

/* --------------------------------------------------------------- form modal */

export function FormDialog<R extends Result>({
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerIcon,
  iconOnly = false,
  title,
  submitLabel = "Save",
  successMessage,
  action,
  onSuccess,
  children,
}: {
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: "sm" | "md";
  triggerIcon?: React.ReactNode;
  iconOnly?: boolean;
  title: string;
  submitLabel?: string;
  successMessage?: string;
  action: (fd: FormData) => Promise<R>;
  /** Return false to keep the dialog open, e.g. to show a result. */
  onSuccess?: (result: Extract<R, { ok: true }>) => boolean | void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (successMessage) toast.success(successMessage);
      const keepOpen = onSuccess?.(res as Extract<R, { ok: true }>) === false;
      if (!keepOpen) setOpen(false);
    });
  }

  return (
    <>
      <Button
        size={triggerSize}
        variant={triggerVariant}
        isIconOnly={iconOnly}
        aria-label={iconOnly ? triggerLabel : undefined}
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {triggerIcon}
        {!iconOnly && triggerLabel}
      </Button>
      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Form onSubmit={submit} className="flex flex-col gap-5">
              <Modal.Body className="flex flex-col gap-4">
                {error && <FormAlert>{error}</FormAlert>}
                {children}
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary" isDisabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" isPending={pending}>
                  {submitLabel}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

/* ------------------------------------------------------------------ fields */

export function Field({
  name,
  label,
  defaultValue,
  type = "text",
  maxLength,
  isRequired = true,
  description,
  min,
  inputMode,
  autoComplete = "off",
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  type?: "text" | "number" | "datetime-local" | "password";
  maxLength?: number;
  isRequired?: boolean;
  description?: string;
  min?: number;
  inputMode?: "numeric" | "text";
  autoComplete?: string;
}) {
  return (
    <TextField
      name={name}
      type={type}
      isRequired={isRequired}
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      maxLength={maxLength}
      autoComplete={autoComplete}
    >
      <Label>{label}</Label>
      <Input min={min} inputMode={inputMode} />
      {description && <Description>{description}</Description>}
      <FieldError />
    </TextField>
  );
}

export function AreaField({
  name,
  label,
  defaultValue,
  maxLength,
  rows = 5,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <TextField name={name} isRequired defaultValue={defaultValue} maxLength={maxLength}>
      <Label>{label}</Label>
      <TextArea rows={rows} />
      <FieldError />
    </TextField>
  );
}

export function Hidden({ name, value }: { name: string; value: string | number }) {
  return <input type="hidden" name={name} value={value} />;
}

export function TimeFields({ startsAt, endsAt }: { startsAt?: string; endsAt?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="startsAt" label="Start" type="datetime-local" defaultValue={startsAt} />
      <Field name="endsAt" label="End" type="datetime-local" defaultValue={endsAt} />
    </div>
  );
}

/* ------------------------------------------------------------------- misc */

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col items-start gap-3 rounded-xl border border-dashed p-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted text-sm">{title}</p>
      {children}
    </div>
  );
}

export function Fill({ taken, capacity }: { taken: number; capacity: number }) {
  const full = taken >= capacity;
  return (
    <span className={`text-sm tabular-nums ${full ? "text-danger font-medium" : ""}`}>
      {taken} / {capacity}
    </span>
  );
}
