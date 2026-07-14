import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function ParkingMarkerSelector({ value, onChange }) {
  const options = [
    { id: "traditional-pin", label: "Pin tradicional" },
    { id: "circle-stick", label: "Círculo con varilla" },
    { id: "circle", label: "Círculo" },
  ];

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "800" }}>Marcador</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: value === option.id ? "#15803d" : "#d1d5db",
              backgroundColor: value === option.id ? "#dcfce7" : "#fff",
            }}
          >
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Example() {
  const [parkingMarkerStyle, setParkingMarkerStyle] = useState(
    "traditional-pin",
  );

  return (
    <>
      <ParkingMarkerSelector
        value={parkingMarkerStyle}
        onChange={setParkingMarkerStyle}
      />

      {/*
      <StoreMapPreview
        lat={mapCenter.lat}
        lng={mapCenter.lng}
        parkingSpots={cabuenesTestSpots}
        mapStyle="gray"
        parkingMarkerStyle={parkingMarkerStyle}
        parkingMarkerColor="#dc2626"
        parkingMarkerScaleByZoom
        parkingMarkerMinSize={18}
        parkingMarkerMaxSize={38}
      />
      */}
    </>
  );
}
