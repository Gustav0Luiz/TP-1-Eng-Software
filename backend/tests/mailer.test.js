const ORIGINAL_ENV = { ...process.env };

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

const nodemailer = require("nodemailer");

const loadMailer = () => {
  let sendMailFn;
  jest.isolateModules(() => {
    ({ sendMail: sendMailFn } = require("../src/lib/mailer"));
  });
  return sendMailFn;
};

describe("lib/mailer sendMail", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  test("usa as variáveis de ambiente e delega ao transporter", async () => {
    process.env.SMTP_HOST = "smtp.secure";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "mailer@secure.test";
    process.env.SMTP_PASS = "secret";
    process.env.MAIL_FROM = "alerts@secure.test";

    const sendMailTransportMock = jest.fn().mockResolvedValue({ messageId: "abc123" });
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailTransportMock });

    const sendMail = loadMailer();
    const payload = {
      to: "dev@example.com",
      subject: "Bem-vindo",
      text: "Olá",
      html: "<p>Olá</p>",
    };

    const info = await sendMail(payload);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.secure",
      port: 465,
      secure: true,
      auth: { user: "mailer@secure.test", pass: "secret" },
    });
    expect(sendMailTransportMock).toHaveBeenCalledWith({
      from: "alerts@secure.test",
      ...payload,
    });
    expect(info).toEqual({ messageId: "abc123" });
  });

  test("usa SMTP_USER como remetente padrão quando MAIL_FROM não é definido", async () => {
    process.env.SMTP_HOST = "smtp.dev";
    process.env.SMTP_PORT = "2525";
    delete process.env.SMTP_SECURE;
    process.env.SMTP_USER = "fallback@test.dev";
    process.env.SMTP_PASS = "pwd";
    delete process.env.MAIL_FROM;

    const sendMailTransportMock = jest.fn().mockResolvedValue({ accepted: ["dest@example.com"] });
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailTransportMock });

    const sendMail = loadMailer();
    await sendMail({ to: "dest@example.com", subject: "Ping" });

    expect(sendMailTransportMock).toHaveBeenCalledWith({
      from: "fallback@test.dev",
      to: "dest@example.com",
      subject: "Ping",
      text: undefined,
      html: undefined,
    });
  });
});
