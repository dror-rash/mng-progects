import * as React from "react";

import { Button } from "./button";
import { FieldError } from "./field-error";
import { Input } from "./input";

type ConfirmByNameProps = {
  /** What has to be typed, exactly. */
  name: string;
  /** The destructive button's label, e.g. "Delete workspace". */
  action: string;
  error?: string;
  pending?: boolean;
  /** Prefix for element ids, when the page has more than one. */
  id?: string;
};

/**
 * The fields of a "type the name to confirm" form for something that can't be undone. The caller owns
 * the <form>; the typed name is posted as `confirmName`, and the server checks it again.
 */
export function ConfirmByName({ name, action, error, pending = false, id = "confirm-name" }: ConfirmByNameProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">Type the name to confirm</label>
      <p id={hintId} className="text-sm text-muted-foreground">
        Type <strong className="font-semibold text-foreground">{name}</strong> to confirm. This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          id={id}
          name="confirmName"
          autoComplete="off"
          required
          className="sm:max-w-xs"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        />
        <Button type="submit" variant="destructive" disabled={pending}>{action}</Button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
