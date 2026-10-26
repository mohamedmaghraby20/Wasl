/**
 * Moves focus to the first control the form marked invalid. The browser needs a
 * frame to commit validation state before the attribute is available.
 */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  if (!form) return;
  window.setTimeout(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, 0);
}
