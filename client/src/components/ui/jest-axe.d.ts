declare module 'jest-axe' {
  export function axe(context: Element): Promise<{ violations: unknown[] }>;
}
