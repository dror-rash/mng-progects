// A form that stays on the page after a successful submit (add a field, then the next one) shouldn't lose what
// was typed while the request was out. React resets an action form when the action's update commits, which
// can come after the user (or a test) has started on the next entry. These two clear only the fields that
// still hold what was sent; use them from `onSubmit` instead of React's reset.

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** What each visible field held when the form was sent. */
export type FieldSnapshot = Map<Field, string | boolean>;

function visibleFields(form: HTMLFormElement): Field[] {
  return [...form.elements].filter(
    (el): el is Field =>
      (el instanceof HTMLInputElement && !["hidden", "submit", "button", "reset"].includes(el.type)) ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement,
  );
}

const isToggle = (el: Field): el is HTMLInputElement => el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");

export function snapshotFields(form: HTMLFormElement): FieldSnapshot {
  return new Map(visibleFields(form).map((el) => [el, isToggle(el) ? el.checked : el.value]));
}

/** Puts back the default of every field still holding its value in `sent`; anything changed since stays. */
export function clearUnchanged(form: HTMLFormElement, sent: FieldSnapshot) {
  for (const el of visibleFields(form)) {
    if (!sent.has(el)) continue;
    if (isToggle(el)) {
      if (el.checked === sent.get(el)) el.checked = el.defaultChecked;
    } else if (el.value === sent.get(el)) {
      if (el instanceof HTMLSelectElement) {
        const options = [...el.options];
        el.value = (options.find((o) => o.defaultSelected) ?? options[0])?.value ?? "";
      } else {
        el.value = el.defaultValue;
      }
    }
  }
}
