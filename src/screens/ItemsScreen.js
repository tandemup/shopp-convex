import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ItemsScreen() {
  const [name, setName] = useState("");

  const items = useQuery(api.items.list) ?? [];
  const createItem = useMutation(api.items.create);
  const toggleChecked = useMutation(api.items.toggleChecked);
  const removeItem = useMutation(api.items.remove);

  const handleCreate = async () => {
    const value = name.trim();

    if (!value) {
      return;
    }

    await createItem({
      name: value,
      qty: 1,
      unit: "ud",
      price: 0,
    });

    setName("");
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nombre del producto"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      <Pressable
        onPress={handleCreate}
        style={{
          padding: 12,
          backgroundColor: "#2563eb",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text
          style={{ color: "white", textAlign: "center", fontWeight: "600" }}
        >
          Añadir producto
        </Text>
      </Pressable>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => toggleChecked({ id: item._id })}
              style={{ flex: 1 }}
            >
              <Text
                style={{
                  fontSize: 16,
                  textDecorationLine: item.checked ? "line-through" : "none",
                }}
              >
                {item.name}
              </Text>

              <Text style={{ color: "#666" }}>
                {item.category || "Sin categoría"} · {item.price ?? 0} €
              </Text>
            </Pressable>

            <Pressable onPress={() => removeItem({ id: item._id })}>
              <Text style={{ color: "red" }}>Eliminar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
