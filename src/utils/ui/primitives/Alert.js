import { safeAlert } from "@/components/ui/alert/safeAlert";

/**
 * Adaptador legado. Mantiene la API anterior, pero delega siempre en la
 * interfaz común para que iOS, Android y Web tengan el mismo aspecto.
 */
export function showAlert(title, message, actions = []) {
  return safeAlert(title, message, actions);
}
