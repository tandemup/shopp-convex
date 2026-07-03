// components/PredictiveSearchBar.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PredictiveSearchBar({
  data = [],
  value,
  onChangeText,
  onSelect,
  placeholder = "Buscar productos",
  maxSuggestions = 8,
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = value?.trim().toLowerCase();

    if (!q) return [];

    return data
      .filter((item) => {
        const text = typeof item === "string" ? item : item.label;
        return text?.toLowerCase().includes(q);
      })
      .slice(0, maxSuggestions);
  }, [data, value, maxSuggestions]);

  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(item) {
    const text = typeof item === "string" ? item : item.label;

    onChangeText?.(text);
    onSelect?.(item);
    setFocused(false);
  }

  function handleClear() {
    onChangeText?.("");
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#6B7280" />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
        />

        {!!value && (
          <Pressable onPress={handleClear} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {showSuggestions && (
        <View style={styles.suggestionsBox}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={suggestions}
            keyExtractor={(item, index) =>
              typeof item === "string"
                ? `${item}-${index}`
                : (item.id ?? `${index}`)
            }
            renderItem={({ item }) => {
              const text = typeof item === "string" ? item : item.label;

              return (
                <Pressable
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {text}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 20,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 10,
  },

  suggestionsBox: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
});
