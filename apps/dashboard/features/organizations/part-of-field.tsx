import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";

export type ParentChoice = { id: string; name: string };

/**
 * "Part of": the company this one is a sub-company of, or None (task 053). A company with sub-companies
 * can only be None, and says why.
 */
export function PartOfField({
  name,
  choices,
  locked,
  chosen,
  error,
}: {
  name?: string;
  choices: ParentChoice[];
  locked: boolean;
  chosen: string;
  error?: string;
}) {
  const describedBy = [locked ? "parentId-hint" : null, error ? "parentId-error" : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-1 sm:col-span-2">
      <label htmlFor="parentId" className="text-sm font-medium">Part of</label>
      {/* Keyed on the submitted value: a select only applies defaultValue when it mounts (see project-form). */}
      <NativeSelect
        key={chosen}
        id="parentId"
        name="parentId"
        defaultValue={chosen}
        {...(error ? { "aria-invalid": true } : {})}
        {...(describedBy ? { "aria-describedby": describedBy } : {})}
      >
        <option value="">None</option>
        {choices.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </NativeSelect>
      {locked ? (
        <p id="parentId-hint" className="text-xs text-muted-foreground">
          {name} has sub-companies, so it can&apos;t be part of another company.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Choose a company if this is one of its sub-companies or brands.</p>
      )}
      <FieldError id="parentId-error" message={error} />
    </div>
  );
}
