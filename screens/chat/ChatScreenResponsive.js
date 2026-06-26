import React, { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

const COLORS = {
  bg: "#F6F8F5",
  panel: "#FFFFFF",
  panelSoft: "#F8FAF7",
  green: "#2E8B3C",
  greenDark: "#14652A",
  greenSoft: "#E8F4E9",
  text: "#141414",
  muted: "#777D86",
  border: "#E3E8E2",
  danger: "#D94A3A",
  bubbleIn: "#FFFFFF",
  bubbleOut: "#EAF6EA",
  shadow: "#000000",
};

const ROOMS = [
  { id: "general", name: "general", icon: "💬" },
  { id: "familia", name: "familia", icon: "👥" },
  { id: "ofertas", name: "ofertas", icon: "🏷️" },
  { id: "tienda", name: "tienda", icon: "🏪" },
];

const INITIAL_MESSAGES = [
  {
    id: "1",
    room: "general",
    username: "Ana",
    text: "¿Compramos leche?",
    createdAt: "10:21",
  },
  {
    id: "2",
    room: "general",
    username: "Josh",
    text: "Sí, añado 2 bricks",
    createdAt: "10:22",
  },
  {
    id: "3",
    room: "general",
    username: "Luis",
    text: "Mira aceite de oliva",
    createdAt: "10:23",
  },
  {
    id: "4",
    room: "general",
    username: "Josh",
    text: "Listo, ya añadí todo a la lista de la compra",
    createdAt: "10:24",
  },
];

const CONNECTED_USERS = [
  { id: "josh", name: "Josh", label: "tú", color: "#CDECCF" },
  { id: "ana", name: "Ana", label: "", color: "#D9B4E5" },
  { id: "luis", name: "Luis", label: "", color: "#C9DAF8" },
];

export default function ChatScreenResponsive() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 900;

  const [activeRoom, setActiveRoom] = useState("general");
  const [username] = useState("Josh");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => message.room === activeRoom);
  }, [messages, activeRoom]);

  const handleSend = () => {
    const cleanText = input.trim();

    if (!cleanText) return;

    const newMessage = {
      id: String(Date.now()),
      room: activeRoom,
      username,
      text: cleanText,
      createdAt: getCurrentTime(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.screen,
            isDesktop && styles.screenDesktop,
            isTablet && styles.screenTablet,
          ]}
        >
          {isDesktop && (
            <Sidebar
              rooms={ROOMS}
              activeRoom={activeRoom}
              onSelectRoom={setActiveRoom}
              username={username}
            />
          )}

          <View
            style={[styles.chatPanel, isDesktop && styles.chatPanelDesktop]}
          >
            {!isDesktop && (
              <MobileHeader
                activeRoom={activeRoom}
                username={username}
                rooms={ROOMS}
                onSelectRoom={setActiveRoom}
              />
            )}

            {isDesktop && (
              <DesktopChatHeader activeRoom={activeRoom} username={username} />
            )}

            <View style={styles.dayDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dayText}>Hoy</Text>
              <View style={styles.dividerLine} />
            </View>

            <FlatList
              data={filteredMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isMine={item.username === username}
                />
              )}
            />

            <Composer
              value={input}
              onChangeText={setInput}
              onSend={handleSend}
              isDesktop={isDesktop}
            />
          </View>

          {isDesktop && <RoomDetails activeRoom={activeRoom} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Sidebar({ rooms, activeRoom, onSelectRoom, username }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>🛍️</Text>
        </View>

        <Text style={styles.logoText}>Shopp</Text>

        <Pressable style={styles.sidebarMenuButton}>
          <Text style={styles.sidebarMenuText}>☰</Text>
        </Pressable>
      </View>

      <Text style={styles.sidebarSectionTitle}>Rooms</Text>

      <View style={styles.roomList}>
        {rooms.map((room) => {
          const selected = room.id === activeRoom;

          return (
            <Pressable
              key={room.id}
              style={[styles.roomItem, selected && styles.roomItemActive]}
              onPress={() => onSelectRoom(room.id)}
            >
              <Text style={styles.roomIcon}>{room.icon}</Text>
              <Text
                style={[styles.roomText, selected && styles.roomTextActive]}
              >
                {room.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>J</Text>
        </View>

        <View style={styles.sidebarUserText}>
          <Text style={styles.sidebarUserName}>{username}</Text>
          <Text style={styles.sidebarUserRole}>Usuario</Text>
        </View>

        <Text style={styles.chevron}>⌄</Text>
      </View>
    </View>
  );
}

function MobileHeader({ activeRoom, username, rooms, onSelectRoom }) {
  return (
    <View style={styles.mobileHeader}>
      <View>
        <Text style={styles.mobileTitle}>Chat de Shopp</Text>
        <Text style={styles.mobileSubtitle}>Usuario: {username}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mobileRoomScroller}
      >
        {rooms.map((room) => {
          const selected = room.id === activeRoom;

          return (
            <Pressable
              key={room.id}
              style={[
                styles.mobileRoomChip,
                selected && styles.mobileRoomChipActive,
              ]}
              onPress={() => onSelectRoom(room.id)}
            >
              <Text
                style={[
                  styles.mobileRoomChipText,
                  selected && styles.mobileRoomChipTextActive,
                ]}
              >
                {room.icon} {room.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DesktopChatHeader({ activeRoom, username }) {
  return (
    <View style={styles.desktopChatHeader}>
      <View>
        <Text style={styles.chatTitle}>Chat: {activeRoom}</Text>
        <Text style={styles.chatSubtitle}>
          Usuario: <Text style={styles.greenText}>{username}</Text>
        </Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.iconButton}>
          <Text style={styles.iconButtonText}>👤＋</Text>
        </Pressable>

        <Pressable style={styles.iconButton}>
          <Text style={styles.iconButtonText}>ⓘ</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({ message, isMine }) {
  const initial = message.username?.charAt(0)?.toUpperCase() || "?";

  return (
    <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
      {!isMine && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}

      <View
        style={[styles.messageContent, isMine && styles.messageContentMine]}
      >
        <View style={styles.messageMetaRow}>
          <Text style={[styles.messageUser, isMine && styles.messageUserMine]}>
            {isMine ? "Tú" : message.username}
          </Text>

          <Text style={styles.messageTime}>{message.createdAt}</Text>
        </View>

        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          <Text style={styles.messageText}>{message.text}</Text>

          {isMine && <Text style={styles.readMark}>✓✓</Text>}
        </View>
      </View>
    </View>
  );
}

function Composer({ value, onChangeText, onSend, isDesktop }) {
  return (
    <View style={[styles.composer, isDesktop && styles.composerDesktop]}>
      <Pressable style={styles.attachButton}>
        <Text style={styles.attachButtonText}>📎</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Escribe mensaje..."
        placeholderTextColor={COLORS.muted}
        multiline={!isDesktop}
        onSubmitEditing={Platform.OS === "web" ? onSend : undefined}
      />

      <Pressable style={styles.sendButton} onPress={onSend}>
        <Text style={styles.sendButtonText}>➤</Text>
      </Pressable>
    </View>
  );
}

function RoomDetails({ activeRoom }) {
  return (
    <View style={styles.detailsPanel}>
      <Text style={styles.detailsTitle}>Detalles del room</Text>

      <View style={styles.roomDetailsCard}>
        <View style={styles.roomDetailsHeader}>
          <View style={styles.roomDetailsIcon}>
            <Text style={styles.roomDetailsIconText}>💬</Text>
          </View>

          <Text style={styles.roomDetailsName}># {activeRoom}</Text>
        </View>

        <Text style={styles.roomDetailsDescription}>
          Conversaciones generales del grupo.
        </Text>

        <Text style={styles.roomDetailsMeta}>
          Creado por Josh el 01/05/2024
        </Text>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.detailsSectionTitle}>Usuarios conectados (3)</Text>

        {CONNECTED_USERS.map((user) => (
          <View key={user.id} style={styles.connectedUserRow}>
            <View
              style={[styles.connectedAvatar, { backgroundColor: user.color }]}
            >
              <Text style={styles.connectedAvatarText}>
                {user.name.charAt(0)}
              </Text>
            </View>

            <View>
              <Text style={styles.connectedUserName}>
                {user.name}
                {user.label ? ` (${user.label})` : ""}
              </Text>

              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>En línea</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.detailsSectionTitle}>Acciones rápidas</Text>

        <ActionRow icon="👤＋" label="Añadir usuarios" />
        <ActionRow icon="🔗" label="Compartir room" />
        <ActionRow icon="🔔" label="Notificaciones" />
        <ActionRow icon="🚪" label="Salir del room" danger />
      </View>
    </View>
  );
}

function ActionRow({ icon, label, danger }) {
  return (
    <Pressable style={styles.actionRow}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>
        {label}
      </Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  );
}

function getCurrentTime() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  keyboardView: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  screenTablet: {
    padding: 16,
  },

  screenDesktop: {
    flexDirection: "row",
    gap: 18,
    padding: 24,
    maxWidth: 1440,
    width: "100%",
    alignSelf: "center",
  },

  sidebar: {
    width: 260,
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },

  logoIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  logoIconText: {
    fontSize: 24,
  },

  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.green,
  },

  sidebarMenuButton: {
    marginLeft: "auto",
    padding: 6,
  },

  sidebarMenuText: {
    color: COLORS.muted,
    fontSize: 18,
  },

  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 14,
  },

  roomList: {
    gap: 8,
  },

  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },

  roomItemActive: {
    backgroundColor: COLORS.greenSoft,
  },

  roomIcon: {
    fontSize: 18,
  },

  roomText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },

  roomTextActive: {
    color: COLORS.green,
    fontWeight: "800",
  },

  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: COLORS.greenDark,
    fontWeight: "800",
  },

  sidebarUserText: {
    marginLeft: 10,
  },

  sidebarUserName: {
    color: COLORS.text,
    fontWeight: "800",
  },

  sidebarUserRole: {
    color: COLORS.muted,
    fontSize: 13,
  },

  chevron: {
    marginLeft: "auto",
    color: COLORS.muted,
    fontSize: 20,
  },

  chatPanel: {
    flex: 1,
    backgroundColor: COLORS.panel,
  },

  chatPanelDesktop: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },

  desktopChatHeader: {
    minHeight: 108,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  chatTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.text,
  },

  chatSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.muted,
  },

  greenText: {
    color: COLORS.green,
    fontWeight: "800",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonText: {
    color: COLORS.green,
    fontSize: 18,
  },

  mobileHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.panel,
  },

  mobileTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
  },

  mobileSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.muted,
  },

  mobileRoomScroller: {
    gap: 8,
    paddingTop: 14,
  },

  mobileRoomChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    marginRight: 8,
  },

  mobileRoomChipActive: {
    backgroundColor: COLORS.greenSoft,
    borderColor: COLORS.greenSoft,
  },

  mobileRoomChipText: {
    color: COLORS.text,
    fontWeight: "700",
  },

  mobileRoomChipTextActive: {
    color: COLORS.green,
  },

  dayDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 32,
    paddingTop: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dayText: {
    color: COLORS.muted,
    fontSize: 13,
  },

  messagesList: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 20,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "100%",
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D9B4E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  messageContent: {
    maxWidth: "78%",
  },

  messageContentMine: {
    maxWidth: "84%",
  },

  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  messageUser: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  messageUserMine: {
    color: COLORS.green,
  },

  messageTime: {
    fontSize: 13,
    color: COLORS.muted,
  },

  bubble: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  bubbleOther: {
    backgroundColor: COLORS.bubbleIn,
  },

  bubbleMine: {
    backgroundColor: COLORS.bubbleOut,
    borderColor: "#D9ECD9",
  },

  messageText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },

  readMark: {
    marginLeft: "auto",
    color: COLORS.green,
    fontWeight: "900",
    fontSize: 13,
  },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.panel,
  },

  composerDesktop: {
    marginHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 10,
  },

  attachButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  attachButtonText: {
    fontSize: 18,
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    color: COLORS.text,
    fontSize: 15,
    outlineStyle: "none",
  },

  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  detailsPanel: {
    width: 300,
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },

  detailsTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 14,
  },

  roomDetailsCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: COLORS.panelSoft,
  },

  roomDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  roomDetailsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenSoft,
    marginRight: 10,
  },

  roomDetailsIconText: {
    fontSize: 18,
  },

  roomDetailsName: {
    color: COLORS.green,
    fontWeight: "900",
    fontSize: 16,
  },

  roomDetailsDescription: {
    color: COLORS.text,
    lineHeight: 20,
    fontSize: 14,
  },

  roomDetailsMeta: {
    color: COLORS.muted,
    marginTop: 14,
    fontSize: 12,
  },

  detailsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  detailsSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },

  connectedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  connectedAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  connectedAvatarText: {
    fontWeight: "900",
    color: COLORS.greenDark,
  },

  connectedUserName: {
    color: COLORS.text,
    fontWeight: "800",
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },

  onlineText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  actionRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  actionIcon: {
    width: 28,
    fontSize: 16,
  },

  actionLabel: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "600",
  },

  actionLabelDanger: {
    color: COLORS.danger,
  },

  actionChevron: {
    color: COLORS.muted,
    fontSize: 22,
  },
});
