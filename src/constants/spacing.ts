export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/**
 * سلّم الارتفاع.
 *
 * ثلاث درجات لا واحدة: السطح الهادئ، والبطاقة، والعائم فوق المحتوى. والظلّ
 * فيها كلها خفيف ومزرقّ لا رمادي — الرقيّ في ضبط النبرة لا في تغليظ الظلّ،
 * وشبكةُ اثنتي عشرة بطاقةً بظلّ ثقيل تبدو صاخبة لا فاخرة.
 */
export const shadow = {
  /** لمسة ارتفاع بالكاد تُرى — للبطاقات المتكرّرة في شبكة أو قائمة. */
  subtle: {
    shadowColor: "#0B2545",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  /** البطاقة المستقلة ذات المحتوى. */
  card: {
    shadowColor: "#0B2545",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  /** ما يعلو المحتوى: الأوراق المنبثقة وأزرار الإجراء العائمة. */
  raised: {
    shadowColor: "#0B2545",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
