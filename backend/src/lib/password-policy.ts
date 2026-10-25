/**
 * Admin password policy. A password that is short, guessable, or derived from public information
 * (your name, your GitHub username) is the easiest way into /admin, so production refuses to start with one.
 */
const MIN_LENGTH = 12;

const GUESSABLE = ['password', 'passw0rd', 'admin', 'qwerty', 'letmein', 'welcome', 'changeme', 'change-me', '123456', 'abcdef', 'iamshuvokd', 'shuvo', 'apptriangle'];

/** Returns why a password is too weak, or null if it is acceptable. */
export function weakPasswordReason(password: string): string | null {
  if (password.length < MIN_LENGTH) return `use at least ${MIN_LENGTH} characters`;
  if (/^(.)\1+$/.test(password)) return 'it is one repeated character';

  const lower = password.toLowerCase();
  const guessable = GUESSABLE.find((word) => lower.includes(word));
  if (guessable) return `it contains the easily guessed word "${guessable}"`;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 2 && password.length < 20) return 'mix letters with digits or symbols, or make it 20+ characters';
  return null;
}
