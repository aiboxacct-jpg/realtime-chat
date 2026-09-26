// Input validation. Same rules the original enforced via zod:
// username 3-20 chars of [A-Za-z0-9_], password 8-72 chars,
// message body 1-500 chars after trimming.

const USERNAME_RE = /^[A-Za-z0-9_]+$/;

export function validUsername(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 3 &&
    value.trim().length <= 20 &&
    USERNAME_RE.test(value.trim())
  );
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 72;
}

export function validMessageBody(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 1 &&
    value.trim().length <= 500
  );
}

export function normalizeUsernameKey(username: string): string {
  return username.trim().toLocaleLowerCase("en-US");
}
