import ResendProvider from "@auth/core/providers/resend";
import { Resend } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const ResendOTPEmailVerification = ResendProvider({
  // Es mejor que no coincida con el proveedor de reset.
  id: "resend-email-verification",

  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    const random = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(random, "0123456789", 8);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error("AUTH_RESEND_KEY no está configurada en Convex");
    }

    const resend = new Resend(provider.apiKey);

    const { data, error } = await resend.emails.send({
      // Durante las pruebas puedes usar onboarding@resend.dev.
      // En producción sustituye shopp.app por un dominio verificado.
      from: "Shopp <onboarding@resend.dev>",
      to: [email],
      subject: "Verifica tu correo en Shopp",

      text: [
        "Bienvenido a Shopp.",
        "",
        `Tu código de verificación es: ${token}`,
        "",
        "Introduce este código en la aplicación para completar el registro.",
        "",
        "Si no has creado una cuenta, puedes ignorar este mensaje.",
      ].join("\n"),

      html: `
        <div style="
          max-width: 520px;
          margin: 0 auto;
          padding: 24px;
          font-family: Arial, sans-serif;
          color: #202124;
        ">
          <h1 style="font-size: 24px; margin-bottom: 16px;">
            Verifica tu correo
          </h1>

          <p>Bienvenido a <strong>Shopp</strong>.</p>

          <p>
            Introduce este código en la aplicación para completar
            la creación de tu cuenta:
          </p>

          <div style="
            margin: 24px 0;
            padding: 18px;
            border-radius: 10px;
            background: #f1f3f4;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 8px;
          ">
            ${token}
          </div>

          <p style="color: #5f6368; font-size: 14px;">
            Si no has creado una cuenta en Shopp, puedes ignorar
            este mensaje.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error enviando código de verificación:", error);

      throw new Error(
        error.message || "No se pudo enviar el código de verificación.",
      );
    }

    console.log("Código de verificación enviado:", data?.id);
  },
});
