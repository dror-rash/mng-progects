import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import type { ReactNode } from "react";

import { type FormAction, FormActionButton } from "./form-action-button";
import { fieldTypeLabel } from "./field-type";

export type FormFieldRow = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
};

/**
 * A reading form's fields, in order (task 060): each label is its row's header. On a draft, admins get a
 * Remove button per field (posting `hidden` and the field's id to `removeAction`) and the `addForm` below;
 * without `removeAction` (auditors, a published form) it is read-only. The page passes the action and the
 * form, so this stays free of server code.
 */
export function FormFieldsSection({
  fields,
  removeAction,
  hidden = {},
  addForm,
}: {
  fields: FormFieldRow[];
  removeAction?: FormAction;
  hidden?: Record<string, string>;
  addForm?: ReactNode;
}) {
  return (
    <section aria-labelledby="fields-heading">
      <Card>
        <CardHeader>
          <CardTitle id="fields-heading" className="text-base">Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields yet.</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">Fields</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Required</TableHead>
                  {removeAction && <TableHead><span className="sr-only">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableHead scope="row">{field.label}</TableHead>
                    <TableCell>{fieldTypeLabel(field.type)}</TableCell>
                    <TableCell>{field.unit ?? ""}</TableCell>
                    <TableCell>{field.options?.join(", ") ?? ""}</TableCell>
                    <TableCell>{field.required ? "Required" : "Optional"}</TableCell>
                    {removeAction && (
                      <TableCell className="text-right">
                        <FormActionButton action={removeAction} hidden={{ ...hidden, fieldId: field.id }} variant="ghost" size="sm">
                          Remove<span className="sr-only"> {field.label}</span>
                        </FormActionButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {addForm && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium">Add a field</h3>
              {addForm}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
