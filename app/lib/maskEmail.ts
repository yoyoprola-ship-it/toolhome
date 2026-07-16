// Enmascara un email para display en el prompt 2FA sin exponer el
// address completo. "yoyoprola@gmail.com" → "y***@g***.com".

export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '***@***';
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@')) return '***@***';
  const atIdx = trimmed.lastIndexOf('@');
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  if (!local || !domain) return '***@***';
  const dotIdx = domain.lastIndexOf('.');
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : '';
  const domainName = dotIdx >= 0 ? domain.slice(0, dotIdx) : domain;
  if (!domainName) return '***@***';
  return `${local.charAt(0) || '*'}***@${domainName.charAt(0) || '*'}***${tld}`;
}
