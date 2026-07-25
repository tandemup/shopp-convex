import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import DatePill from "@/src/components/controls/DatePill";
import CurrencyBadge from "@/src/components/ui/CurrencyBadge";
import { safeAlert, safeMenu } from "@/src/components/ui/alert/safeAlert";
import { DEFAULT_CURRENCY } from "@/src/constants/currency";
import { useLists } from "@/src/context/ListsContext";
import { ROUTES } from "@/src/navigation/ROUTES";
import { buildHeaderConfig } from "@/src/utils/layout/headerStyles";

const COLORS = {
  background: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",

  text: "#172033",
  textMuted: "#667085",
  textSoft: "#98A2B3",

  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primarySoft: "#EAF2FF",

  green: "#15803D",
  greenSoft: "#ECFDF3",

  purple: "#7C3AED",
  purpleSoft: "#F3E8FF",

  orange: "#C2410C",
  orangeSoft: "#FFF1E7",

  cyan: "#0369A1",
  cyanSoft: "#E0F2FE",

  red: "#DC2626",
  redSoft: "#FEE2E2",

  border: "#E4E7EC",
  borderStrong: "#D0D5DD",
};

const headerConfig = buildHeaderConfig({
  title: "Shopp",
  preset: "light",
});

function SummaryCard({ icon, label, value, color, backgroundColor }) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.summaryTextBlock}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

function QuickAction({
  width,
  label,
  description,
  icon,
  iconColor,
  iconBackground,
  badge = 0,
  badgeLabel,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { width },
        pressed && styles.quickActionPressed,
      ]}
    >
      <View style={styles.quickActionTop}>
        <View
          style={[
            styles.quickActionIcon,
            {
              backgroundColor: iconBackground,
            },
          ]}
        >
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>

        {badgeLabel ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{badgeLabel}</Text>
          </View>
        ) : badge > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.quickActionLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.quickActionDescription} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
}

function QuickActions({
  archivedCount = 0,
  historyCount = 0,
  scannedCount = 0,
  isAdmin = false,
}) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const contentWidth = Math.min(width - 32, 920);
  const isWide = contentWidth >= 720;
  const isMedium = contentWidth >= 480;

  const columns = isWide ? 4 : isMedium ? 3 : 2;
  const gap = 10;

  const cardWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const navigateToNestedRoute = useCallback(
    (tab, screen) => {
      navigation.navigate(tab, {
        screen,
      });
    },
    [navigation],
  );

  const actions = useMemo(
    () => [
      {
        key: "archived",
        label: "Archivadas",
        description: "Consulta listas finalizadas",
        icon: "archive-outline",
        iconColor: COLORS.primary,
        iconBackground: COLORS.primarySoft,
        badge: archivedCount,
        onPress: () =>
          navigateToNestedRoute(ROUTES.SHOPPING_TAB, ROUTES.ARCHIVED_LISTS),
      },
      {
        key: "history",
        label: "Compras",
        description: "Historial de compras",
        icon: "receipt-outline",
        iconColor: COLORS.purple,
        iconBackground: COLORS.purpleSoft,
        badge: historyCount,
        onPress: () =>
          navigateToNestedRoute(ROUTES.SHOPPING_TAB, ROUTES.PURCHASE_HISTORY),
      },
      {
        key: "scanned",
        label: "Escaneos",
        description: "Escanea productos y consulta el historial",
        icon: "barcode-outline",
        iconColor: COLORS.cyan,
        iconBackground: COLORS.cyanSoft,
        badge: scannedCount,
        // El acceso rápido debe abrir el tab Scanner completo para
        // centralizar allí todas sus acciones, en lugar de saltar
        // directamente a una pantalla interna como el historial.
        onPress: () => navigation.navigate(ROUTES.SCANNER_TAB),
      },
      {
        key: "chat",
        label: "Chat",
        description: "Comparte información",
        icon: "chatbubble-ellipses-outline",
        iconColor: COLORS.purple,
        iconBackground: COLORS.purpleSoft,
        badgeLabel: "NUEVO",
        onPress: () =>
          navigateToNestedRoute(ROUTES.CHAT_TAB, ROUTES.CHAT_SCREEN),
      },
      {
        key: "parking",
        label: "Parking",
        description: "Localiza tu vehículo",
        icon: "car-outline",
        iconColor: COLORS.green,
        iconBackground: COLORS.greenSoft,
        badgeLabel: "NUEVO",
        onPress: () =>
          navigateToNestedRoute(ROUTES.CHAT_TAB, ROUTES.PARKING_SCREEN),
      },
      ...(isAdmin
        ? [
            {
              key: "parkingGpsDebug",
              label: "GPS Debug",
              description: "Comprueba la precisión",
              icon: "locate-outline",
              iconColor: COLORS.orange,
              iconBackground: COLORS.orangeSoft,
              badgeLabel: "DEV",
              onPress: () =>
                navigateToNestedRoute(
                  ROUTES.CHAT_TAB,
                  ROUTES.PARKING_GPS_DEBUG,
                ),
            },
          ]
        : []),
      ...(__DEV__ && isAdmin
        ? [
            {
              key: "carrefour",
              label: "Carrefour",
              description: "Pruebas de productos",
              icon: "cart-outline",
              iconColor: COLORS.green,
              iconBackground: COLORS.greenSoft,
              badgeLabel: "DEV",
              onPress: () =>
                navigateToNestedRoute(
                  ROUTES.SHOPPING_TAB,
                  ROUTES.CARREFOUR_TEST,
                ),
            },
          ]
        : []),
    ],
    [archivedCount, historyCount, isAdmin, navigateToNestedRoute, scannedCount],
  );

  return (
    <View style={styles.quickSection}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>

          <Text style={styles.sectionSubtitle}>
            Herramientas y funciones de Shopp
          </Text>
        </View>
      </View>

      <View style={styles.quickGrid}>
        {actions.map(({ key, ...actionProps }) => (
          <QuickAction key={key} width={cardWidth} {...actionProps} />
        ))}
      </View>
    </View>
  );
}

function ListCard({ item, onOpen, onOpenMenu }) {
  const currency = item.currency ?? DEFAULT_CURRENCY;
  const itemCount = item.items?.length || 0;

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.listCard,
        pressed && styles.listCardPressed,
      ]}
    >
      <View style={styles.listCardIcon}>
        <Ionicons name="basket-outline" size={23} color={COLORS.primary} />
      </View>

      <View style={styles.listCardContent}>
        <View style={styles.listNameRow}>
          <Text style={styles.listName} numberOfLines={1}>
            {item.name || "Lista sin nombre"}
          </Text>

          <CurrencyBadge currency={currency} size="sm" />
        </View>

        <View style={styles.listMetadata}>
          <View style={styles.productCount}>
            <Ionicons name="cube-outline" size={14} color={COLORS.textMuted} />

            <Text style={styles.productCountText}>
              {itemCount} {itemCount === 1 ? "producto" : "productos"}
            </Text>
          </View>

          <DatePill
            date={item.createdAt}
            fallback="Sin fecha"
            icon="calendar-outline"
          />
        </View>
      </View>

      <Pressable
        hitSlop={10}
        onPress={(event) => {
          event.stopPropagation?.();
          onOpenMenu(item);
        }}
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.menuButtonPressed,
        ]}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={21}
          color={COLORS.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

export default function ShoppingListsScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const currentUser = useQuery(api.users.current);

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

  const maxContentWidth = width >= 1000 ? 920 : undefined;

  useEffect(() => {
    navigation.setOptions(headerConfig.navigationOptions);
  }, [navigation]);

  const sortedActiveLists = useMemo(
    () =>
      [...activeLists].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      ),
    [activeLists],
  );

  const buildTodayListName = useCallback(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const baseName = `${year}-${month}-${day}`;

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
  }, [activeLists, archivedLists]);

  const handleArchive = useCallback(
    (list) => {
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
    },
    [archiveList],
  );

  const handleDelete = useCallback(
    (list) => {
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
    },
    [deleteList],
  );

  const openEditName = useCallback((list) => {
    setEditingList(list);
    setEditName(list?.name || "");
  }, []);

  const openListMenu = useCallback(
    (list) => {
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
    },
    [handleArchive, handleDelete, openEditName],
  );

  const handleAddList = useCallback(() => {
    setEditingList(null);
    setEditName(buildTodayListName());
  }, [buildTodayListName]);

  const handleOpenList = useCallback(
    (listId) => {
      navigation.navigate(ROUTES.SHOPPING_LIST, {
        listId,
      });
    },
    [navigation],
  );

  const closeEditModal = useCallback(() => {
    setEditingList(undefined);
    setEditName("");
  }, []);

  const handleConfirmEditName = useCallback(() => {
    const name = editName.trim();

    if (!name) {
      return;
    }

    if (editingList) {
      updateList(editingList.id, {
        name,
      });
    } else {
      createList(name, DEFAULT_CURRENCY);
    }

    closeEditModal();
  }, [closeEditModal, createList, editName, editingList, updateList]);

  const renderListItem = useCallback(
    ({ item }) => (
      <ListCard item={item} onOpen={handleOpenList} onOpenMenu={openListMenu} />
    ),
    [handleOpenList, openListMenu],
  );

  const listHeader = (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroDecorativeCircleOne} />

        <View style={styles.heroDecorativeCircleTwo} />

        <View style={styles.heroContent}>
          <View style={styles.heroLabelRow}>
            <View style={styles.heroLogo}>
              <Ionicons name="basket" size={22} color="#FFFFFF" />
            </View>

            <Text style={styles.heroLabel}>Tu asistente de compras</Text>
          </View>

          <Text style={styles.heroTitle}>Organiza mejor tus compras</Text>

          <Text style={styles.heroDescription}>
            Crea listas, consulta productos y accede rápidamente a las
            principales herramientas.
          </Text>

          <Pressable
            onPress={handleAddList}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <View style={styles.primaryButtonIcon}>
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </View>

            <Text style={styles.primaryButtonText}>Nueva lista</Text>

            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          icon="list-outline"
          label="Listas activas"
          value={activeLists.length}
          color={COLORS.primary}
          backgroundColor={COLORS.primarySoft}
        />

        <SummaryCard
          icon="archive-outline"
          label="Archivadas"
          value={archivedLists.length}
          color={COLORS.green}
          backgroundColor={COLORS.greenSoft}
        />
      </View>

      <QuickActions
        archivedCount={archivedLists.length}
        historyCount={0}
        scannedCount={0}
        isAdmin={currentUser?.isAdmin === true}
      />

      <View style={styles.listsSectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Mis listas</Text>

          <Text style={styles.sectionSubtitle}>
            {activeLists.length === 0
              ? "Todavía no tienes listas activas"
              : `${activeLists.length} ${
                  activeLists.length === 1 ? "lista activa" : "listas activas"
                }`}
          </Text>
        </View>

        {activeLists.length > 0 ? (
          <Pressable
            onPress={handleAddList}
            style={({ pressed }) => [
              styles.smallAddButton,
              pressed && styles.smallAddButtonPressed,
            ]}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="basket-outline" size={40} color={COLORS.primary} />
      </View>

      <Text style={styles.emptyTitle}>Crea tu primera lista</Text>

      <Text style={styles.emptyDescription}>
        Añade los productos que necesitas y mantén organizada tu próxima compra.
      </Text>

      <Pressable
        onPress={handleAddList}
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && styles.emptyButtonPressed,
        ]}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />

        <Text style={styles.emptyButtonText}>Crear lista</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar {...headerConfig.statusBar} />

      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View
          style={[
            styles.pageContainer,
            maxContentWidth && {
              maxWidth: maxContentWidth,
              alignSelf: "center",
            },
          ]}
        >
          <FlatList
            data={sortedActiveLists}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderListItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        <Modal
          transparent
          visible={editingList !== undefined}
          animationType="fade"
          onRequestClose={closeEditModal}
        >
          <Pressable style={styles.modalOverlay} onPress={closeEditModal}>
            <Pressable
              style={styles.modalCard}
              onPress={(event) => event.stopPropagation?.()}
            >
              <View style={styles.modalIcon}>
                <Ionicons
                  name={editingList ? "create-outline" : "add-circle-outline"}
                  size={25}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.modalTitle}>
                {editingList ? "Editar lista" : "Nueva lista"}
              </Text>

              <Text style={styles.modalDescription}>
                {editingList
                  ? "Introduce el nuevo nombre de la lista."
                  : "Introduce un nombre para identificar la lista."}
              </Text>

              <Text style={styles.inputLabel}>Nombre</Text>

              <TextInput
                autoFocus
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={handleConfirmEditName}
                placeholder="Nombre de la lista"
                placeholderTextColor={COLORS.textSoft}
                returnKeyType="done"
                selectTextOnFocus={!editingList}
                style={styles.modalInput}
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeEditModal}
                  style={({ pressed }) => [
                    styles.modalCancel,
                    pressed && styles.modalCancelPressed,
                  ]}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  disabled={!editName.trim()}
                  onPress={handleConfirmEditName}
                  style={({ pressed }) => [
                    styles.modalConfirm,
                    !editName.trim() && styles.modalConfirmDisabled,
                    pressed && editName.trim() && styles.modalConfirmPressed,
                  ]}
                >
                  <Text style={styles.modalConfirmText}>
                    {editingList ? "Guardar" : "Crear lista"}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.background,
  },

  safeArea: {
    flex: 1,
    width: "100%",
  },

  pageContainer: {
    flex: 1,
    width: "100%",
  },

  listContent: {
    flexGrow: 1,
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  heroCard: {
    minHeight: 260,
    overflow: "hidden",
    backgroundColor: COLORS.primary,
    borderRadius: 24,
  },

  heroContent: {
    zIndex: 2,
    padding: 22,
  },

  heroDecorativeCircleOne: {
    position: "absolute",
    top: -80,
    right: -55,
    width: 210,
    height: 210,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 105,
  },

  heroDecorativeCircleTwo: {
    position: "absolute",
    right: 35,
    bottom: -105,
    width: 190,
    height: 190,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 95,
  },

  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  heroLogo: {
    width: 40,
    height: 40,
    marginRight: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 13,
  },

  heroLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "700",
  },

  heroTitle: {
    maxWidth: 400,
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  heroDescription: {
    maxWidth: 500,
    marginTop: 10,
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 22,
  },

  primaryButton: {
    alignSelf: "flex-start",
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 15,
  },

  primaryButtonPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  primaryButtonIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  primaryButtonText: {
    marginRight: 18,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  summaryRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 80,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    marginRight: 11,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },

  summaryTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 25,
  },

  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  quickSection: {
    marginTop: 28,
  },

  sectionHeader: {
    marginBottom: 13,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  quickAction: {
    minHeight: 140,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  quickActionPressed: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  quickActionTop: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  quickActionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },

  quickActionLabel: {
    marginTop: 13,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  quickActionDescription: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  countBadge: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.red,
    borderRadius: 12,
  },

  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  newBadge: {
    minHeight: 21,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.redSoft,
    borderRadius: 10,
  },

  newBadgeText: {
    color: COLORS.red,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.35,
  },

  listsSectionHeader: {
    marginTop: 30,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  smallAddButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 13,
  },

  smallAddButtonPressed: {
    opacity: 0.7,
  },

  listCard: {
    minHeight: 92,
    marginBottom: 10,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  listCardPressed: {
    backgroundColor: COLORS.surfaceMuted,
    transform: [
      {
        scale: 0.993,
      },
    ],
  },

  listCardIcon: {
    width: 48,
    height: 48,
    marginRight: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 15,
  },

  listCardContent: {
    flex: 1,
    minWidth: 0,
  },

  listNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  listName: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  listMetadata: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  productCount: {
    flexDirection: "row",
    alignItems: "center",
  },

  productCountText: {
    marginLeft: 4,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  menuButton: {
    width: 38,
    height: 38,
    marginLeft: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  menuButtonPressed: {
    backgroundColor: COLORS.surfaceMuted,
  },

  emptyState: {
    minHeight: 270,
    paddingHorizontal: 24,
    paddingVertical: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 25,
  },

  emptyTitle: {
    marginTop: 18,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    maxWidth: 340,
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  emptyButton: {
    minHeight: 45,
    marginTop: 19,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },

  emptyButtonPressed: {
    opacity: 0.82,
  },

  emptyButtonText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.48)",
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
  },

  modalIcon: {
    width: 46,
    height: 46,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: 15,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },

  modalDescription: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  inputLabel: {
    marginTop: 19,
    marginBottom: 7,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  modalInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 13,
    fontSize: 15,
  },

  modalActions: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  modalCancel: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },

  modalCancelPressed: {
    opacity: 0.75,
  },

  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },

  modalConfirm: {
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 13,
  },

  modalConfirmDisabled: {
    opacity: 0.4,
  },

  modalConfirmPressed: {
    backgroundColor: COLORS.primaryDark,
  },

  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
