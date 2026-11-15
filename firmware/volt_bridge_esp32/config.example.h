#pragma once
// Copy to config.local.h and edit locally. Do not commit Wi-Fi passwords or tokens.
#define WIFI_SSID ""
#define WIFI_PASSWORD ""
#define DEVICE_TOKEN "" // 16–128 random letters, digits, underscores or hyphens
#define RELAY_ACTIVE_LOW true
#define PROTOTYPE_CAPACITY_AH 2.0f // Replace with measured cell capacity; 2 Ah is illustrative.
#define PRODUCTION_CAPACITY_AH 0.0f // Required for backup prediction; obtain from installed battery.
#define PRODUCTION_NOMINAL_VOLTAGE 51.2f // 16S LiFePO4; adjust for the actual pack.
#define PRODUCTION_COMMISSIONED false // Enable only after register, relay driver and protection checks.
#define GROWATT_PROFILE_CONFIRMED false // SPF V0.11 profile; not blanket Inverex compatibility.
#define GROWATT_SLAVE_ID 1
#define GROWATT_BAUD 9600
#define RS485_RX_PIN 32
#define RS485_TX_PIN 33
#define RS485_DE_RE_PIN 25
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define PROTOTYPE_MAX_CURRENT_A 1.0f // Must not exceed cell, boost, wiring or relay ratings.
#define PRODUCTION_MAX_CURRENT_A 20.0f // Commission for actual wiring/load; not the contactor nameplate.
