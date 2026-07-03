import { Linking, Platform } from "react-native";

export function prepareExternalWindow() {
  if (Platform.OS !== "web") {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    /*
     * Importante:
     * NO usar "noopener,noreferrer" aquí.
     * Si usamos noopener, algunos navegadores devuelven null y perdemos
     * la referencia a la nueva pestaña.
     *
     * Esta llamada debe hacerse directamente desde el onPress del usuario.
     */
    const externalWindow = window.open("about:blank", "_blank");

    if (!externalWindow) {
      return null;
    }

    try {
      externalWindow.document.title = "Abriendo buscador...";

      externalWindow.document.body.innerHTML = `
        <main style="
          min-height: 100vh;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc;
          color: #0f172a;
        ">
          <section style="text-align: center; padding: 24px;">
            <h1 style="font-size: 20px; margin: 0 0 8px;">
              Abriendo buscador...
            </h1>
            <p style="font-size: 14px; color: #64748b; margin: 0;">
              Shopp permanece abierta en la pestaña anterior.
            </p>
          </section>
        </main>
      `;
    } catch {}

    return externalWindow;
  } catch {
    return null;
  }
}

export function closePreparedExternalWindow(externalWindow) {
  if (!externalWindow) {
    return;
  }

  try {
    if (!externalWindow.closed) {
      externalWindow.close();
    }
  } catch {}
}

export async function openExternalUrl(url, options = {}) {
  const safeUrl = String(url ?? "").trim();

  if (!safeUrl) {
    return {
      ok: false,
      reason: "empty-url",
    };
  }

  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return {
        ok: false,
        reason: "window-unavailable",
      };
    }

    const preparedWindow = options?.preparedWindow ?? null;

    try {
      /*
       * Caso recomendado:
       * Ya tenemos una pestaña abierta por el gesto del usuario.
       * Solo cambiamos su URL.
       */
      if (preparedWindow && !preparedWindow.closed) {
        preparedWindow.location.replace(safeUrl);

        try {
          preparedWindow.focus();
        } catch {}

        return {
          ok: true,
          target: "prepared-window",
        };
      }

      /*
       * Fallback:
       * Puede ser bloqueado si ya hubo awaits antes.
       */
      const openedWindow = window.open(safeUrl, "_blank");

      if (!openedWindow) {
        return {
          ok: false,
          reason: "popup-blocked",
        };
      }

      try {
        openedWindow.focus();
      } catch {}

      return {
        ok: true,
        target: "new-window",
      };
    } catch (error) {
      return {
        ok: false,
        reason: "web-open-failed",
        error,
      };
    }
  }

  try {
    const canOpen = await Linking.canOpenURL(safeUrl);

    if (!canOpen) {
      return {
        ok: false,
        reason: "unsupported-url",
      };
    }

    await Linking.openURL(safeUrl);

    return {
      ok: true,
      target: "native-linking",
    };
  } catch (error) {
    return {
      ok: false,
      reason: "native-open-failed",
      error,
    };
  }
}
