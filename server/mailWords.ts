// The words of the two messages the server sends (accounts.ts), in the app's three languages. They live here and not
// with the app's other words because the server image carries no src/locales.
export const MAIL_LANGS = ["en", "ka", "ru"] as const;
export type MailLang = (typeof MAIL_LANGS)[number];
export const mailLang = (v: unknown): MailLang => (MAIL_LANGS.includes(v as MailLang) ? (v as MailLang) : "en");

type Message = { subject: string; text: string };
/** verify: sent when an account is made, to confirm the address. reset: sent when a new password is asked for. */
const WORDS: Record<MailLang, { verify: Message; reset: Message }> = {
  en: {
    verify: {
      subject: "Confirm your email for Zeno",
      text: "Hello {name},\n\nAn account was made on Zeno with this email address. Open this link to confirm the address is yours:\n\n{link}\n\nIf it wasn't you, leave the link alone: nothing happens without it.\n",
    },
    reset: {
      subject: "A new password for Zeno",
      text: "Hello {name},\n\nOpen this link to choose a new password. It works once, for one hour:\n\n{link}\n\nIf you didn't ask for it, leave the link alone: your password stays as it is.\n",
    },
  },
  ka: {
    verify: {
      subject: "დაადასტურეთ ელფოსტა Zeno-სთვის",
      text: "გამარჯობა, {name}!\n\nამ ელფოსტის მისამართით Zeno-ზე ანგარიში შეიქმნა. გახსენით ბმული და დაადასტურეთ, რომ მისამართი თქვენია:\n\n{link}\n\nთუ ეს თქვენ არ იყავით, ბმულს ნუ გახსნით: მის გარეშე არაფერი მოხდება.\n",
    },
    reset: {
      subject: "ახალი პაროლი Zeno-სთვის",
      text: "გამარჯობა, {name}!\n\nგახსენით ბმული და აირჩიეთ ახალი პაროლი. ბმული ერთხელ მუშაობს, ერთი საათის განმავლობაში:\n\n{link}\n\nთუ ეს თქვენ არ მოგითხოვიათ, ბმულს ნუ გახსნით: პაროლი იგივე დარჩება.\n",
    },
  },
  ru: {
    verify: {
      subject: "Подтвердите почту для Zeno",
      text: "Здравствуйте, {name}!\n\nС этим адресом почты в Zeno создан аккаунт. Откройте ссылку, чтобы подтвердить, что адрес ваш:\n\n{link}\n\nЕсли это были не вы, не открывайте ссылку: без неё ничего не произойдёт.\n",
    },
    reset: {
      subject: "Новый пароль для Zeno",
      text: "Здравствуйте, {name}!\n\nОткройте ссылку и выберите новый пароль. Она сработает один раз, в течение часа:\n\n{link}\n\nЕсли вы этого не запрашивали, не открывайте ссылку: пароль останется прежним.\n",
    },
  },
};

export function mailWords(lang: MailLang, kind: "verify" | "reset", name: string, link: string): Message {
  const m = WORDS[lang][kind];
  return { subject: m.subject, text: m.text.replace("{name}", () => name).replace("{link}", () => link) };
}
