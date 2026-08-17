/** Converts a caught value (always `unknown` in a catch block) into a displayable string. Thrown
 *  errors are usually real `Error` instances, but callers can throw anything - falls back to
 *  `String(err)` for the rest rather than assuming. */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
