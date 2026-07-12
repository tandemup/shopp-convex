import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

const random = /** @type {RandomReader} */ ({
  read(bytes) {
    crypto.getRandomValues(bytes);
  },
});

export const ResendOTPEmailVerification = Resend({
  id: "resend-email-verification",

  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    return generateRandomString(random, "0123456789", 8);
  },

  async sendVerificationRequest({ identifier, provider, token }) {
    const email = identifier?.trim().toLowerCase();

    if (!email) {
      throw new Error("No se ha recibido una dirección de correo válida.");
    }

    if (!provider.apiKey) {
      throw new Error(
        "AUTH_RESEND_KEY no está configurada en el deployment de Convex.",
      );
    }

    const resend = new ResendAPI(provider.apiKey);

    const { error } = await resend.emails.send({
      from: "Shopp <auth@ramshopp.com>",
      to: [email],
      subject: "Verifica tu correo electrónico en Shopp",
      text: [
        "Verificación de correo electrónico",
        "",
        `Tu código de verificación es: ${token}`,
        "",
        "Introduce este código en Shopp para completar el registro.",
        "",
        "Si no has creado una cuenta, puedes ignorar este mensaje.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
          <h2>Verifica tu correo electrónico</h2>

          <p>Introduce este código en Shopp para completar el registro:</p>

          <div style="
            margin: 24px 0;
            padding: 16px;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 8px;
            background: #f3f4f6;
            border-radius: 10px;
          ">
            ${token}
          </div>

          <p>Si no has creado una cuenta en Shopp, puedes ignorar este mensaje.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Error Resend durante la verificación:", error);

      throw new Error(
        `Resend rechazó el envío: ${error.message ?? "Error desconocido"}`,
      );
    }
  },
});
