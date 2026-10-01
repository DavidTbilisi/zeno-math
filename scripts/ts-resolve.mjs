// Resolve hook for ts-register.mjs: retry a relative import without an extension as ".ts".
export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (spec.startsWith(".") && !/\.\w+$/.test(spec)) return next(spec + ".ts", ctx);
    throw e;
  }
}
