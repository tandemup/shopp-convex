import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const MARKER_OPTIONS = [
  {
    id: "traditional-pin",
    label: "Pin tradicional",
  },
  {
    id: "circle-stick",
    label: "Círculo con varilla",
  },
  {
    id: "circle",
    label: "Círculo",
  },
];

function TraditionalPinMarker({ selected = false }) {
  return (
    <View style={styles.previewArea}>
      <View
        style={[styles.pinHead, selected && styles.selectedMarkerBackground]}
      >
        <Text style={styles.markerLetter}>P</Text>
      </View>

      <View style={[styles.pinTip, selected && styles.selectedPinTip]} />
    </View>
  );
}

function CircleStickMarker({ selected = false }) {
  return (
    <View style={styles.previewArea}>
      <View
        style={[
          styles.stickCircle,
          selected && styles.selectedMarkerBackground,
        ]}
      >
        <Text style={styles.markerLetter}>P</Text>
      </View>

      <View
        style={[
          styles.markerStick,
          selected && styles.selectedMarkerBackground,
        ]}
      />

      <View style={styles.markerShadow} />
    </View>
  );
}

function CircleMarker({ selected = false }) {
  return (
    <View style={styles.previewArea}>
      <View
        style={[
          styles.circleMarker,
          selected && styles.selectedMarkerBackground,
        ]}
      >
        <Text style={styles.markerLetter}>P</Text>
      </View>
    </View>
  );
}

function MarkerPreview({ type, selected }) {
  if (type === "traditional-pin") {
    return <TraditionalPinMarker selected={selected} />;
  }

  if (type === "circle-stick") {
    return <CircleStickMarker selected={selected} />;
  }

  return <CircleMarker selected={selected} />;
}

export function ParkingMarkerSelector({ value = "traditional-pin", onChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marcador</Text>

      <View style={styles.options}>
        {MARKER_OPTIONS.map((option) => {
          const selected = value === option.id;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Marcador ${option.label}`}
              onPress={() => onChange?.(option.id)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.selectedOption,
                pressed && styles.pressedOption,
              ]}
            >
              <MarkerPreview type={option.id} selected={selected} />

              <Text
                numberOfLines={2}
                style={[
                  styles.optionLabel,
                  selected && styles.selectedOptionLabel,
                ]}
              >
                {option.label}
              </Text>

              <View style={[styles.radio, selected && styles.selectedRadio]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const GREEN = "#15803d";
const LIGHT_GREEN = "#dcfce7";

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  title: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
  },

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  option: {
    width: 138,
    minHeight: 142,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 18,
    backgroundColor: "#ffffff",
  },

  selectedOption: {
    borderWidth: 2,
    borderColor: GREEN,
    backgroundColor: "#f0fdf4",
  },

  pressedOption: {
    opacity: 0.75,
  },

  optionLabel: {
    minHeight: 38,
    color: "#374151",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  selectedOptionLabel: {
    color: "#166534",
  },

  previewArea: {
    width: 72,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },

  pinHead: {
    zIndex: 2,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#16a34a",

    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  pinTip: {
    width: 18,
    height: 18,
    marginTop: -10,
    backgroundColor: "#16a34a",
    transform: [{ rotate: "45deg" }],
  },

  selectedPinTip: {
    backgroundColor: GREEN,
  },

  stickCircle: {
    zIndex: 2,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#16a34a",

    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  markerStick: {
    width: 5,
    height: 20,
    marginTop: -2,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },

  markerShadow: {
    width: 25,
    height: 7,
    marginTop: -2,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },

  circleMarker: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 4,
    borderColor: "#ffffff",
    backgroundColor: "#16a34a",

    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 5,
  },

  selectedMarkerBackground: {
    backgroundColor: GREEN,
  },

  markerLetter: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  radio: {
    width: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9ca3af",
    backgroundColor: "#ffffff",
  },

  selectedRadio: {
    borderColor: GREEN,
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GREEN,
  },
});
