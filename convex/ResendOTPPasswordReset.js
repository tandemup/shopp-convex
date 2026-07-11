import ResendProvider from "@auth/core/providers/resend";
import { Resend } from "resend";
import { generateRandomString } from "@oslojs/crypto/random";

export const ResendOTPPasswordReset = ResendProvider({
  id: "resend-password-reset",

  apiKey: process.env.RESEND_API_KEY,

  async generateVerificationToken() {
    const randomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(randomReader, "0123456789", 8);
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const apiKey = provider.apiKey;

    if (!apiKey) {
      throw new Error("Falta la variable de entorno RESEND_API_KEY en Convex.");
    }

    console.log("[Password reset] Intentando enviar código:", {
      to: email,
      hasApiKey: Boolean(apiKey),
      tokenLength: token?.length,
      tokenIsNumeric: /^\d{8}$/.test(token || ""),
    });

    const resend = new Resend(apiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: "Shopp <onboarding@resend.dev>",
        to: [email],
        subject: "Código para restablecer tu contraseña",

        text: [
          "Has solicitado cambiar la contraseña de tu cuenta de Shopp.",
          "",
          `Tu código de verificación es: ${token}`,
          "",
          "Si no solicitaste este cambio, puedes ignorar este correo.",
        ].join("\n"),

        html: `
          <!DOCTYPE html>
          <html lang="es">
            <body
              style="
                font-family: Arial, sans-serif;
                color: #0f172a;
              "
            >
              <div
                style="
                  max-width: 520px;
                  margin: 0 auto;
                  padding: 24px;
                "
              >
                <h1 style="font-size: 24px;">
                  Restablecer contraseña
                </h1>

                <p>
                  Has solicitado cambiar la contraseña de tu cuenta
                  de Shopp.
                </p>

                <p>Tu código de verificación es:</p>

                <div
                  style="
                    margin: 24px 0;
                    padding: 18px;
                    border-radius: 12px;
                    background: #eef2ff;
                    text-align: center;
                    font-size: 30px;
                    font-weight: bold;
                    letter-spacing: 8px;
                  "
                >
                  ${token}
                </div>

                <p>
                  Si no solicitaste este cambio, puedes ignorar este
                  correo.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("[Password reset] Resend rechazó el envío:", {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode,
        });

        throw new Error(
          `Resend rechazó el envío: ${error.message || "error desconocido"}`,
        );
      }

      console.log("[Password reset] Código enviado correctamente:", {
        id: data?.id,
        to: email,
      });
    } catch (error) {
      console.error("[Password reset] Error completo:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Error desconocido al enviar el código.");
    }
  },
});
