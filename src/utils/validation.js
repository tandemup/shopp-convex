import { normalizarNombre } from "./normalize";

export default function validarNombreListaEnTiempoReal(
  nombre,
  activeLists = [],
  archivedLists = [],
  { minLength = 3, maxLength = 50 } = {},
) {
  const trimmed = nombre.trim();

  if (!trimmed) {
    return { valido: false, mensaje: null }; // no mostramos error aún
  }

  if (trimmed.length < minLength) {
    return {
      valido: false,
      mensaje: `Mínimo ${minLength} caracteres`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valido: false,
      mensaje: `Máximo ${maxLength} caracteres`,
    };
  }

  const regex = /^[a-zA-Z0-9_-]+$/;

  if (!regex.test(trimmed)) {
    return {
      valido: false,
      mensaje: "Solo letras, números, - y _",
    };
  }

  const normalized = normalizarNombre(trimmed);
  const existe = [...activeLists, ...archivedLists].some(
    (list) => normalizarNombre(list.name) === normalized,
  );

  if (existe) {
    return {
      valido: false,
      mensaje: "Ya existe una lista con este nombre",
    };
  }

  return { valido: true, mensaje: "Nombre disponible ✅" };
}
