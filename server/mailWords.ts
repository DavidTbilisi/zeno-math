// The words of the messages the server sends (accounts.ts), in the app's three languages. They live here and not
// with the app's other words because the server image carries no src/locales.
export const MAIL_LANGS = ["en", "ka", "ru"] as const;
export type MailLang = (typeof MAIL_LANGS)[number];
export const mailLang = (v: unknown): MailLang => (MAIL_LANGS.includes(v as MailLang) ? (v as MailLang) : "en");

type Message = { subject: string; text: string };
/**
 * verify: sent when an account is made, to confirm the address. reset: sent when a new password is asked for.
 * teach: sent to the admins when someone with a confirmed address asks to be a teacher (#873).
 */
const WORDS: Record<MailLang, { verify: Message; reset: Message; teach: Message }> = {
  en: {
    verify: {
      subject: "Confirm your email for Zeno",
      text: "Hello {name},\n\nAn account was made on Zeno with this email address. Open this link to confirm the address is yours:\n\n{link}\n\nIf it wasn't you, leave the link alone: nothing happens without it.\n",
    },
    reset: {
      subject: "A new password for Zeno",
      text: "Hello {name},\n\nOpen this link to choose a new password. It works once, for one hour:\n\n{link}\n\nIf you didn't ask for it, leave the link alone: your password stays as it is.\n",
    },
    teach: {
      subject: "{name} asks to be a teacher on Zeno",
      text: "{name} ({email}) asks to be a teacher on Zeno.\n\nTo give them the role, open \"Teachers and roles\" and press \"Make teacher\" in their row:\n\n{link}\n\nIf you don't know them, leave it: they stay a student.\n",
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
    teach: {
      subject: "{name} Zeno-ზე მასწავლებლობას ითხოვს",
      text: "{name} ({email}) Zeno-ზე მასწავლებლის როლს ითხოვს.\n\nროლის მისაცემად გახსენით „მასწავლებლები და როლები“ და მის სტრიქონში დააჭირეთ „მასწავლებლად დანიშვნას“:\n\n{link}\n\nთუ არ იცნობთ, არაფერი გააკეთოთ: ის მოსწავლედ დარჩება.\n",
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
    teach: {
      subject: "{name} просит роль учителя в Zeno",
      text: "{name} ({email}) просит роль учителя в Zeno.\n\nЧтобы дать её, откройте «Учителя и роли» и нажмите «Сделать учителем» в строке этого человека:\n\n{link}\n\nЕсли вы не знаете этого человека, ничего не делайте: роль останется прежней.\n",
    },
  },
};

/** email: the asker's address, in a teach mail. */
export function mailWords(lang: MailLang, kind: "verify" | "reset" | "teach", name: string, link: string, email = ""): Message {
  const m = WORDS[lang][kind];
  const put = (s: string) => s.replaceAll("{name}", () => name).replaceAll("{email}", () => email).replace("{link}", () => link);
  return { subject: put(m.subject), text: put(m.text) };
}
