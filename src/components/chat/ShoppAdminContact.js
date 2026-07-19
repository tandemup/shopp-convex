import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { safeAlert } from "@/src/components/ui/alert/safeAlert";

const DEFAULT_ADMIN_EMAIL = "info@ramshopp.com";
const DEFAULT_SUBJECT = "Comunicación privada a la administración de Shopp";
const MAX_REPORT_LENGTH = 2000;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAssetSize(asset) {
  return Number(asset?.size || asset?.file?.size || 0);
}

function getAssetMimeType(asset) {
  return String(
    asset?.mimeType || asset?.file?.type || "application/octet-stream",
  ).toLowerCase();
}

function getGoogleDriveFileId(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  const filePathMatch = text.match(/\/file\/d\/([^/?#]+)/);

  if (filePathMatch?.[1]) {
    return filePathMatch[1];
  }

  try {
    const parsedUrl = new URL(text);
    return parsedUrl.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

function getGoogleDriveDownloadLink(value) {
  const text = String(value || "").trim();
  const fileId = getGoogleDriveFileId(text);

  if (!fileId) return text;

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function isValidExternalLink(value) {
  const text = String(value || "").trim();

  if (!text) return true;

  try {
    const parsedUrl = new URL(text);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

export default function ShoppAdminContact({
  adminEmail = DEFAULT_ADMIN_EMAIL,
  room = "general",
  username = "anonymous",
  inModal = false,
}) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const generateUploadUrl = useMutation(api.rightsReports.generateUploadUrl);
  const registerAttachment = useMutation(api.rightsReports.registerAttachment);
  const deleteDraftAttachment = useMutation(
    api.rightsReports.deleteDraftAttachment,
  );
  const clearMyDraftAttachments = useMutation(
    api.rightsReports.clearMyDraftAttachments,
  );
  const sendReport = useAction(api.rightsReportActions.sendReport);

  const cleanEmail = String(adminEmail || "").trim();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();
  const cleanDriveLink = driveLink.trim();
  const remainingChars = MAX_REPORT_LENGTH - message.length;
  const totalAttachmentSize = attachments.reduce(
    (sum, item) => sum + item.size,
    0,
  );

  const canSend = useMemo(() => {
    return (
      Boolean(cleanEmail) &&
      Boolean(cleanSubject) &&
      Boolean(cleanMessage) &&
      remainingChars >= 0 &&
      !uploading &&
      !sending
    );
  }, [
    cleanEmail,
    cleanSubject,
    cleanMessage,
    remainingChars,
    uploading,
    sending,
  ]);

  const handlePickDocuments = async () => {
    if (uploading || sending) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
        base64: false,
      });

      if (result.canceled || !result.assets?.length) return;

      // Tras recargar la pantalla el estado local se pierde. Antes de iniciar
      // una selección nueva, elimina posibles borradores huérfanos del usuario.
      if (attachments.length === 0) {
        await clearMyDraftAttachments();
      }

      if (attachments.length + result.assets.length > MAX_FILES) {
        safeAlert(
          "Demasiados adjuntos",
          `Puedes adjuntar como máximo ${MAX_FILES} archivos.`,
        );
        return;
      }

      const selected = result.assets.map((asset) => ({
        asset,
        size: getAssetSize(asset),
        mimeType: getAssetMimeType(asset),
      }));

      const invalidType = selected.find(
        ({ mimeType }) => !ALLOWED_MIME_TYPES.includes(mimeType),
      );
      const invalidSize = selected.find(
        ({ size }) => size <= 0 || size > MAX_FILE_SIZE,
      );
      const selectedTotal = selected.reduce((sum, item) => sum + item.size, 0);

      if (invalidType) {
        safeAlert(
          "Archivo no permitido",
          "Solo se admiten PDF, imágenes, texto y documentos Word.",
        );
        return;
      }

      if (invalidSize) {
        safeAlert(
          "Archivo demasiado grande",
          "Cada archivo debe ocupar como máximo 5 MB.",
        );
        return;
      }

      if (totalAttachmentSize + selectedTotal > MAX_TOTAL_SIZE) {
        safeAlert(
          "Adjuntos demasiado grandes",
          "El conjunto de archivos no puede superar 10 MB.",
        );
        return;
      }

      setUploading(true);

      for (const { asset, size, mimeType } of selected) {
        const fileBody =
          asset.file ||
          (await fetch(asset.uri).then((response) => response.blob()));
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: fileBody,
        });

        if (!uploadResponse.ok) {
          throw new Error(`No se pudo subir ${asset.name}.`);
        }

        const { storageId } = await uploadResponse.json();
        const attachmentId = await registerAttachment({
          storageId,
          fileName: asset.name,
          mimeType,
          size,
        });

        setAttachments((current) => [
          ...current,
          {
            id: attachmentId,
            name: asset.name,
            mimeType,
            size,
          },
        ]);
      }
    } catch (error) {
      console.error("Error seleccionando adjuntos:", error);
      safeAlert(
        "No se pudieron añadir los archivos",
        error?.message || "Inténtalo de nuevo.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachment) => {
    if (uploading || sending) return;

    setAttachments((current) =>
      current.filter((item) => item.id !== attachment.id),
    );

    try {
      await deleteDraftAttachment({ attachmentId: attachment.id });
    } catch (error) {
      console.error("Error eliminando el adjunto:", error);
      setAttachments((current) => [...current, attachment]);
      safeAlert("Error", "No se pudo eliminar el archivo.");
    }
  };

  const handleSend = async () => {
    if (!canSend) return;

    if (!isValidExternalLink(cleanDriveLink)) {
      safeAlert(
        "Enlace no válido",
        "Introduce un enlace completo, por ejemplo https://drive.google.com/...",
      );
      return;
    }

    setSending(true);

    try {
      const driveDownloadLink = getGoogleDriveDownloadLink(cleanDriveLink);
      const reportMessage = driveDownloadLink
        ? `${cleanMessage}\n\nEnlace de descarga Google Drive:\n${driveDownloadLink}`
        : cleanMessage;

      await sendReport({
        subject: cleanSubject,
        message: reportMessage,
        room: String(room || "general").trim(),
        username: String(username || "anonymous").trim(),
        attachmentIds: attachments.map((item) => item.id),
      });

      setMessage("");
      setSubject(DEFAULT_SUBJECT);
      setDriveLink("");
      setAttachments([]);
      safeAlert(
        "Mensaje enviado",
        "La comunicación privada se ha enviado a la administración de Shopp.",
      );
    } catch (error) {
      console.error("Error enviando la comunicación:", error);
      setAttachments([]);
      safeAlert("No se pudo enviar", error?.message || "Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.card, inModal && styles.cardInModal]}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#1d4ed8" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Contacto con administración</Text>
          <Text style={styles.description}>
            Comunica de forma privada una posible vulneración de derechos.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Correo de Shopp</Text>
      <View style={styles.emailBox}>
        <Ionicons name="mail-outline" size={18} color="#475569" />
        <Text style={styles.emailText} selectable>
          {cleanEmail}
        </Text>
      </View>

      <Text style={styles.label}>Asunto</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="Asunto del mensaje"
        placeholderTextColor="#94a3b8"
        style={styles.input}
        maxLength={160}
        editable={!sending}
      />

      <View style={styles.messageLabelRow}>
        <Text style={styles.label}>Descripción</Text>
        <Text style={styles.counter}>
          {remainingChars}/{MAX_REPORT_LENGTH}
        </Text>
      </View>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Describe los hechos con claridad. No incluyas contraseñas ni datos bancarios."
        placeholderTextColor="#94a3b8"
        style={styles.messageInput}
        multiline
        textAlignVertical="top"
        maxLength={MAX_REPORT_LENGTH}
        editable={!sending}
      />

      <Text style={styles.label}>Enlace de Google Drive</Text>
      <TextInput
        value={driveLink}
        onChangeText={setDriveLink}
        placeholder="https://drive.google.com/file/d/..."
        placeholderTextColor="#94a3b8"
        style={styles.input}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!sending}
      />
      <Text style={styles.helpText}>
        Para fotos o vídeos grandes, pega aquí un enlace compartido de Drive. Si
        es posible, se enviará como enlace de descarga.
      </Text>

      <View style={styles.attachmentHeader}>
        <Text style={styles.label}>Documentos adjuntos</Text>
        <Text style={styles.counter}>
          {attachments.length}/{MAX_FILES} ·{" "}
          {formatFileSize(totalAttachmentSize)}
        </Text>
      </View>

      {attachments.map((attachment) => (
        <View key={attachment.id} style={styles.attachmentRow}>
          <Ionicons name="document-attach-outline" size={19} color="#1d4ed8" />
          <View style={styles.attachmentTextBlock}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {attachment.name}
            </Text>
            <Text style={styles.attachmentSize}>
              {formatFileSize(attachment.size)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${attachment.name}`}
            onPress={() => handleRemoveAttachment(attachment)}
            disabled={uploading || sending}
            style={styles.removeButton}
          >
            <Ionicons name="close-circle" size={22} color="#b91c1c" />
          </Pressable>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar documentos adjuntos"
        onPress={handlePickDocuments}
        disabled={uploading || sending || attachments.length >= MAX_FILES}
        style={({ pressed }) => [
          styles.attachButton,
          (uploading || sending || attachments.length >= MAX_FILES) &&
            styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons name="attach-outline" size={19} color="#1d4ed8" />
        <Text style={styles.attachButtonText}>
          {uploading ? "Añadiendo archivos…" : "Añadir documentos"}
        </Text>
      </Pressable>

      <Text style={styles.privacyText}>
        Los archivos no se publican en el chat. Se eliminan del almacenamiento
        temporal después de intentar enviar el correo. Máximo: 5 archivos, 5 MB
        por archivo y 10 MB en total.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar comunicación privada a la administración de Shopp"
        disabled={!canSend}
        onPress={handleSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend && styles.buttonDisabled,
          pressed && canSend && styles.buttonPressed,
        ]}
      >
        <Ionicons name="send-outline" size={18} color="#ffffff" />
        <Text style={styles.sendButtonText}>
          {sending ? "Enviando…" : "Enviar mensaje privado"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    gap: 9,
  },
  cardInModal: {
    marginTop: 0,
    borderWidth: 0,
    padding: 0,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 3,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  headerText: { flex: 1 },
  title: { color: "#172554", fontSize: 14, fontWeight: "900" },
  description: {
    marginTop: 3,
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  label: { color: "#334155", fontSize: 12, fontWeight: "900" },
  emailBox: {
    minHeight: 42,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emailText: {
    flex: 1,
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
  },
  messageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  helpText: {
    marginTop: -3,
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
  },
  messageInput: {
    minHeight: 112,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 19,
  },
  attachmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  attachmentRow: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachmentTextBlock: { flex: 1, minWidth: 0 },
  attachmentName: { color: "#1e293b", fontSize: 12, fontWeight: "800" },
  attachmentSize: { marginTop: 2, color: "#64748b", fontSize: 11 },
  removeButton: { padding: 3 },
  attachButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  attachButtonText: { color: "#1d4ed8", fontSize: 12, fontWeight: "900" },
  privacyText: { color: "#64748b", fontSize: 11, lineHeight: 16 },
  sendButton: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.82 },
  sendButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
});
