export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

type BaseTextOptions = {
  field: string;
  maxLength: number;
  allowCodeLike?: boolean;
  collapseWhitespace?: boolean;
  transform?: "none" | "lower" | "upper";
};

type RequiredTextOptions = BaseTextOptions & {
  minLength?: number;
};

type OptionalTextOptions = BaseTextOptions & {
  minLength?: number;
};

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const SINGLE_LINE_BREAK_RE = /[\r\n]/;
const CODE_LIKE_CHARS_RE = /[<>`]/;
const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

function normalizeText(
  value: string,
  collapseWhitespace: boolean,
  transform: "none" | "lower" | "upper",
) {
  const collapsed = collapseWhitespace
    ? value.trim().replace(/\s+/g, " ")
    : value.trim();

  if (transform === "lower") {
    return collapsed.toLowerCase();
  }
  if (transform === "upper") {
    return collapsed.toUpperCase();
  }
  return collapsed;
}

function validateSingleLine(
  value: string,
  options: RequiredTextOptions,
): ValidationResult<string> {
  const normalized = normalizeText(
    value,
    options.collapseWhitespace ?? false,
    options.transform ?? "none",
  );

  if (!normalized) {
    return { ok: false, message: `${options.field} is required` };
  }
  if (CONTROL_CHARS_RE.test(normalized) || SINGLE_LINE_BREAK_RE.test(normalized)) {
    return {
      ok: false,
      message: `${options.field} contains invalid characters`,
    };
  }
  if (!(options.allowCodeLike ?? false) && CODE_LIKE_CHARS_RE.test(normalized)) {
    return {
      ok: false,
      message: `${options.field} contains invalid characters`,
    };
  }
  if (options.minLength !== undefined && normalized.length < options.minLength) {
    return {
      ok: false,
      message: `${options.field} must be at least ${options.minLength} characters`,
    };
  }
  if (normalized.length > options.maxLength) {
    return {
      ok: false,
      message: `${options.field} must be at most ${options.maxLength} characters`,
    };
  }

  return { ok: true, value: normalized };
}

function validateOptionalSingleLine(
  value: unknown,
  options: OptionalTextOptions,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${options.field} must be a string` };
  }

  const normalized = normalizeText(
    value,
    options.collapseWhitespace ?? false,
    options.transform ?? "none",
  );
  if (!normalized) {
    return { ok: true, value: undefined };
  }

  const validated = validateSingleLine(normalized, options);
  if (!validated.ok) {
    return validated;
  }

  return { ok: true, value: validated.value };
}

export function parseRequiredSingleLineText(
  value: unknown,
  options: RequiredTextOptions,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { ok: false, message: `${options.field} is required` };
  }
  return validateSingleLine(value, options);
}

export function parseOptionalSingleLineText(
  value: unknown,
  options: OptionalTextOptions,
): ValidationResult<string | undefined> {
  return validateOptionalSingleLine(value, options);
}

export function parseRequiredEmail(
  value: unknown,
  options: { field: string; maxLength?: number },
): ValidationResult<string> {
  const emailText = parseRequiredSingleLineText(value, {
    field: options.field,
    maxLength: options.maxLength ?? 254,
    allowCodeLike: true,
    transform: "lower",
  });
  if (!emailText.ok) {
    return emailText;
  }
  if (!SIMPLE_EMAIL_RE.test(emailText.value)) {
    return { ok: false, message: `${options.field} is invalid` };
  }

  return emailText;
}

export function parseOptionalEmail(
  value: unknown,
  options: { field: string; maxLength?: number },
): ValidationResult<string | undefined> {
  const emailText = parseOptionalSingleLineText(value, {
    field: options.field,
    maxLength: options.maxLength ?? 254,
    allowCodeLike: true,
    transform: "lower",
  });
  if (!emailText.ok || emailText.value === undefined) {
    return emailText;
  }
  if (!SIMPLE_EMAIL_RE.test(emailText.value)) {
    return { ok: false, message: `${options.field} is invalid` };
  }

  return emailText;
}

export function parseOptionalMultilineText(
  value: unknown,
  options: {
    field: string;
    maxLength: number;
    allowCodeLike?: boolean;
  },
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${options.field} must be a string` };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ok: true, value: undefined };
  }
  if (CONTROL_CHARS_RE.test(normalized)) {
    return {
      ok: false,
      message: `${options.field} contains invalid characters`,
    };
  }
  if (!(options.allowCodeLike ?? true) && CODE_LIKE_CHARS_RE.test(normalized)) {
    return {
      ok: false,
      message: `${options.field} contains invalid characters`,
    };
  }
  if (normalized.length > options.maxLength) {
    return {
      ok: false,
      message: `${options.field} must be at most ${options.maxLength} characters`,
    };
  }

  return { ok: true, value: normalized };
}

export function parseRequiredCurrencyCode(
  value: unknown,
  options: { field: string },
): ValidationResult<string> {
  const code = parseRequiredSingleLineText(value, {
    field: options.field,
    maxLength: 3,
    allowCodeLike: true,
    transform: "upper",
  });
  if (!code.ok) {
    return code;
  }
  if (!CURRENCY_CODE_RE.test(code.value)) {
    return { ok: false, message: `${options.field} is invalid` };
  }

  return code;
}

export function parseOptionalCurrencyCode(
  value: unknown,
  options: { field: string },
): ValidationResult<string | undefined> {
  const code = parseOptionalSingleLineText(value, {
    field: options.field,
    maxLength: 3,
    allowCodeLike: true,
    transform: "upper",
  });
  if (!code.ok || code.value === undefined) {
    return code;
  }
  if (!CURRENCY_CODE_RE.test(code.value)) {
    return { ok: false, message: `${options.field} is invalid` };
  }

  return code;
}

export function parseOptionalInternalPath(
  value: unknown,
  options: { field: string; maxLength: number },
): ValidationResult<string | undefined> {
  const parsed = parseOptionalSingleLineText(value, {
    field: options.field,
    maxLength: options.maxLength,
    allowCodeLike: true,
  });
  if (!parsed.ok || parsed.value === undefined) {
    return parsed;
  }
  if (!parsed.value.startsWith("/") || parsed.value.startsWith("//")) {
    return { ok: false, message: `${options.field} is invalid` };
  }
  return parsed;
}

export function parsePathParam(
  value: unknown,
  options: { field: string; maxLength: number },
): ValidationResult<string> {
  return parseRequiredSingleLineText(value, {
    field: options.field,
    maxLength: options.maxLength,
    allowCodeLike: false,
  });
}
