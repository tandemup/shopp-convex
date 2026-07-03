import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import DatePill from "@/src/components/controls/DatePill";
import CurrencyBadge from "@/src/components/ui/CurrencyBadge";
import { safeAlert, safeMenu } from "@/src/components/ui/alert/safeAlert";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";
import { useLists } from "@/src/context/ListsContext";
import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

const headerConfig = buildHeaderConfig({
  title: "Shopping Lists",
  preset: "light",
});

function MenuNavegacion2({
  archivedCount = 0,
  historyCount = 0,
  scannedCount = 0,
  onCreateList,
}) {
  const navigation = useNavigation();

  const openChat = React.useCallback(() => {
    navigation.navigate(ROUTES.CHAT_TAB, {
      screen: ROUTES.CHAT_SCREEN,
    });
  }, [navigation]);

  const openChatResponsive = React.useCallback(() => {
    navigation.navigate(ROUTES.CHAT_TAB, {
      screen: ROUTES.CHAT_SCREEN_RESPONSIVE,
    });
  }, [navigation]);

  const openParking = React.useCallback(() => {
    navigation.navigate(ROUTES.CHAT_TAB, {
      screen: ROUTES.PARKING_SCREEN,
    });
  }, [navigation]);

  /*    
    {
      key: "chat2",
      label: "Chat2",
      icon: "chatbox-ellipses-outline",
      isNew: true,
      variant: "purple",
      onPress: openChatResponsive,
    },
 */
  const actions = [
    {
      key: "new",
      label: "Nueva lista",
      icon: "add-outline",
      onPress: onCreateList,
    },
    {
      key: "archived",
      label: "Archivadas",
      icon: "archive-outline",
      tab: ROUTES.SHOPPING_TAB,
      route: ROUTES.ARCHIVED_LISTS,
      badge: archivedCount,
    },
    {
      key: "history",
      label: "Compras",
      icon: "receipt-outline",
      tab: ROUTES.SHOPPING_TAB,
      route: ROUTES.PURCHASE_HISTORY,
      badge: historyCount,
    },
    {
      key: "scanned",
      label: "Escaneos",
      icon: "barcode-outline",
      tab: ROUTES.SCANNER_TAB,
      route: ROUTES.SCANNED_HISTORY,
      badge: scannedCount,
    },
    {
      key: "chat",
      label: "Chat",
      icon: "chatbubble-ellipses-outline",
      isNew: true,
      variant: "purple",
      onPress: openChat,
    },
    {
      key: "parking",
      label: "Parking",
      icon: "car-outline",
      isNew: true,
      variant: "green",
      onPress: openParking,
    },
  ];

  return (
    <View style={quickStyles.wrapper}>
      <Text style={quickStyles.title}>Accesos rápidos</Text>

      <ScrollView
        horizontal
        style={quickStyles.scrollContainer}
        contentContainerStyle={quickStyles.scrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {actions.map((action) => {
          const isPurple = action.variant === "purple";
          const isGreen = action.variant === "green";

          return (
            <Pressable
              key={action.key}
              onPress={() => {
                if (action.onPress) {
                  action.onPress();
                  return;
                }

                if (action.tab && action.route) {
                  navigation.navigate(action.tab, {
                    screen: action.route,
                  });
                }
              }}
              style={({ pressed }) => [
                quickStyles.card,
                isPurple && quickStyles.cardPurple,
                isGreen && quickStyles.cardGreen,
                pressed && quickStyles.cardPressed,
              ]}
            >
              {action.isNew ? (
                <View style={quickStyles.newBadge}>
                  <Text style={quickStyles.newBadgeText}>NUEVO</Text>
                </View>
              ) : null}

              <View
                style={[
                  quickStyles.iconBox,
                  isPurple && quickStyles.iconBoxPurple,
                  isGreen && quickStyles.iconBoxGreen,
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={isPurple ? "#6d28d9" : isGreen ? "#15803d" : "#2563eb"}
                />

                {action.badge > 0 ? (
                  <View style={quickStyles.badge}>
                    <Text style={quickStyles.badgeText}>
                      {action.badge > 99 ? "99+" : action.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  quickStyles.label,
                  isPurple && quickStyles.labelPurple,
                  isGreen && quickStyles.labelGreen,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ShoppingListsScreen() {
  const navigation = useNavigation();
  const listRef = useRef(null);

  const {
    activeLists = [],
    archivedLists = [],
    createList,
    deleteList,
    updateList,
    archiveList,
  } = useLists();

  const [editingList, setEditingList] = useState(undefined);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation]);

  const buildTodayListName = () => {
    const today = new Date();
    const baseName = today.toISOString().slice(0, 10);

    const allNames = [...activeLists, ...archivedLists].map((list) =>
      String(list.name || "").trim(),
    );

    if (!allNames.includes(baseName)) {
      return baseName;
    }

    let suffix = 2;

    while (allNames.includes(`${baseName}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseName}-${suffix}`;
  };

  const handleArchive = (list) => {
    safeAlert(
      "Archivar lista",
      `¿Quieres archivar la lista “${list?.name || "Sin nombre"}”?`,
      [
        {
          key: "cancel",
          text: "Cancelar",
          style: "cancel",
        },
        {
          key: "archive",
          text: "Archivar",
          style: "default",
          onPress: () => archiveList(list.id),
        },
      ],
    );
  };

  const handleDelete = (list) => {
    safeAlert(
      "Eliminar lista",
      `¿Quieres eliminar definitivamente la lista “${
        list?.name || "Sin nombre"
      }”?`,
      [
        {
          key: "cancel",
          text: "Cancelar",
          style: "cancel",
        },
        {
          key: "delete",
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteList(list.id),
        },
      ],
    );
  };

  const openListMenu = (list) => {
    safeMenu("Opciones", list?.name || "", [
      {
        key: "edit",
        text: "Editar nombre",
        style: "default",
        onPress: () => openEditName(list),
      },
      {
        key: "archive",
        text: "Archivar",
        style: "default",
        onPress: () => handleArchive(list),
      },
      {
        key: "delete",
        text: "Eliminar",
        style: "destructive",
        onPress: () => handleDelete(list),
      },
      {
        key: "cancel",
        text: "Cancelar",
        style: "cancel",
      },
    ]);
  };

  const handleAddList = () => {
    setEditingList(null);
    setEditName(buildTodayListName());
  };

  const handleOpenList = (listId) => {
    navigation.navigate(ROUTES.SHOPPING_LIST, { listId });
  };

  const openEditName = (list) => {
    setEditingList(list);
    setEditName(list?.name || "");
  };

  const closeEditModal = () => {
    setEditingList(undefined);
    setEditName("");
  };

  const handleConfirmEditName = () => {
    const name = editName.trim();

    if (!name) {
      return;
    }

    if (editingList) {
      updateList(editingList.id, { name });
    } else {
      createList(name, DEFAULT_CURRENCY);
    }

    closeEditModal();
  };

  const renderItem = ({ item }) => {
    const currency = item.currency ?? DEFAULT_CURRENCY;

    return (
      <Pressable style={styles.card} onPress={() => handleOpenList(item.id)}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <CurrencyBadge currency={currency} size="sm" />
          </View>

          <Pressable
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation?.();
              openListMenu(item);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#555" />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Creada en</Text>

          <DatePill
            date={item.createdAt}
            fallback="Sin fecha"
            icon="calendar-outline"
          />
        </View>

        <Text style={styles.count}>{item.items?.length || 0} productos</Text>
      </Pressable>
    );
  };

  const sortedActiveLists = [...activeLists].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>Shopping Lists</Text>

          <Text style={styles.subtitle}>
            Crea, consulta y gestiona tus listas de compra activas.
          </Text>

          <MenuNavegacion2
            archivedCount={archivedLists.length}
            historyCount={0}
            scannedCount={0}
            onCreateList={handleAddList}
          />

          <FlatList
            ref={listRef}
            style={styles.list}
            data={sortedActiveLists}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={
              <Text style={styles.listHeader}>Mis Listas</Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyText}>
                  No tienes listas activas 😊
                </Text>

                <Text style={styles.emptyHint}>
                  Pulsa + para crear tu primera lista
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <Modal
          transparent
          visible={editingList !== undefined}
          animationType="fade"
        >
          <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
            <Pressable
              style={styles.modalCard}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.modalTitle}>
                {editingList ? "Editar nombre" : "Nueva lista"}
              </Text>

              <TextInput
                autoFocus
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={handleConfirmEditName}
              />

              <View style={styles.modalActions}>
                <Pressable onPress={closeEditModal} style={styles.modalCancel}>
                  <Text>Cancelar</Text>
                </Pressable>

                <Pressable
                  disabled={!editName.trim()}
                  onPress={handleConfirmEditName}
                  style={[
                    styles.modalConfirm,
                    !editName.trim() && styles.modalConfirmDisabled,
                  ]}
                >
                  <Text style={styles.modalConfirmText}>
                    {editingList ? "Guardar" : "Crear"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const quickStyles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: "100%",
    marginTop: 12,
    marginBottom: 8,
    overflow: "visible",
  },

  title: {
    marginBottom: 12,
    color: "#374151",
    fontSize: 20,
    fontWeight: "700",
  },

  scrollContainer: {
    width: "100%",
    maxWidth: "100%",
  },

  scrollContent: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },

  card: {
    width: 104,
    minHeight: 96,
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    borderRadius: 16,
  },

  cardPurple: {
    borderColor: "#c084fc",
    backgroundColor: "#faf5ff",
  },

  cardGreen: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },

  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  iconBox: {
    width: 46,
    height: 46,
    marginBottom: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 23,
  },

  iconBoxPurple: {
    backgroundColor: "#f3e8ff",
  },

  iconBoxGreen: {
    backgroundColor: "#dcfce7",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 10,
  },

  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },

  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  labelPurple: {
    color: "#581c87",
    fontWeight: "800",
  },

  labelGreen: {
    color: "#14532d",
    fontWeight: "800",
  },

  newBadge: {
    position: "absolute",
    top: -6,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 10,
  },

  newBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "#FAFAFA",
  },

  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    paddingTop: 24,
    paddingHorizontal: 20,
  },

  title: {
    marginBottom: 8,
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    marginBottom: 18,
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
  },

  list: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
  },

  listContent: {
    paddingTop: 12,
    paddingBottom: 120,
  },

  listHeader: {
    marginBottom: 12,
    color: "#374151",
    fontSize: 20,
    fontWeight: "700",
  },

  card: {
    marginBottom: 14,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#BFD7FF",
    borderRadius: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },

  metaLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  count: {
    color: "#6B7280",
    fontSize: 13,
  },

  emptyBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },

  emptyText: {
    marginTop: 40,
    color: "#888",
    fontSize: 15,
    textAlign: "center",
  },

  emptyHint: {
    marginTop: 6,
    color: "#9CA3AF",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalCard: {
    width: "85%",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  modalTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700",
  },

  modalInput: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  modalCancel: {
    padding: 10,
  },

  modalConfirm: {
    padding: 10,
    backgroundColor: "#16a34a",
    borderRadius: 8,
  },

  modalConfirmDisabled: {
    opacity: 0.5,
  },

  modalConfirmText: {
    color: "#fff",
  },
});
