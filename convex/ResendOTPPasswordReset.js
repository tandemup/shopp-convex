import ResendProvider from "@auth/core/providers/resend";
import { Resend } from "resend";
import { generateRandomString } from "@oslojs/crypto/random";

export const ResendOTPPasswordReset = ResendProvider({
  id: "resend-password-reset",

  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    const randomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(randomReader, "0123456789", 8);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new Resend(provider.apiKey);

    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM || "Shopp <onboarding@resend.dev>",

      to: [email],

      subject: "Código para cambiar tu contraseña de Shopp",

      text: [
        "Has solicitado cambiar la contraseña de tu cuenta Shopp.",
        "",
        `Tu código de verificación es: ${token}`,
        "",
        "Si no has solicitado este cambio, ignora este mensaje.",
      ].join("\n"),

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Cambiar contraseña de Shopp</h2>

          <p>
            Has solicitado cambiar la contraseña de tu cuenta.
          </p>

          <p>Introduce este código en Shopp:</p>

          <div
            style="
              display: inline-block;
              padding: 14px 20px;
              margin: 12px 0;
              border-radius: 8px;
              background-color: #eff6ff;
              color: #1d4ed8;
              font-size: 26px;
              font-weight: 700;
              letter-spacing: 5px;
            "
          >
            ${token}
          </div>

          <p>
            Si no has solicitado este cambio, ignora este mensaje.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error enviando el código de recuperación:", error);

      throw new Error("No se pudo enviar el código de recuperación.");
    }
  },
});
