import { safeMenu } from "@/components/ui/alert/safeAlert";

export function showOptions(title, options = []) {
  return safeMenu(title, "", options);
}
