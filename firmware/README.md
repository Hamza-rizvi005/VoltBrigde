# Volt Bridge hardware integration

The local dashboard at http://127.0.0.1:5173/app/dashboard contains the shared hardware panel. Run `npm run dev` from `frontend/` (Node 24 or newer). The web interface, local bridge and firmware use schema version 1 and SI units internally. A selected UI mode must match the firmware compiled onto the device; the selector does not reflash it.

## Build and configure

Open `volt_bridge_esp32/volt_bridge_esp32.ino` in Arduino IDE with the Espressif ESP32 board package. Target a classic ESP32/WROOM board with the listed GPIOs available. ESP32 variants and PSRAM boards can reserve GPIO16/17; validate your actual board.

Install ArduinoJson **7**, Adafruit INA219 (including Adafruit BusIO), PZEM004Tv30 and ModbusMaster. Copy `config.example.h` to ignored `config.local.h`. Enter Wi-Fi details and a unique random device token (16–128 letters, numbers, underscores or hyphens). Do not use a password already used elsewhere. No real credentials are included in this repository.

- Prototype is the default build: `MODE_PROTOTYPE_INA219`.
- Residential: define `MODE_PRODUCTION_PZEM_RS485` instead (or pass `-DMODE_PRODUCTION_PZEM_RS485`). Never define both.
- Set measured battery capacity, relay polarity, current limits, serial address and pins for the hardware.
- Residential telemetry is enabled by `GROWATT_PROFILE_CONFIRMED=true` after confirming the exact device profile. Relay ON also requires `PRODUCTION_COMMISSIONED=true`. Both default to false. Battery capacity defaults to unknown, so backup remains unavailable until configured.
- Upload, open Serial Monitor at 115200, then enter the printed LAN IP and token into the panel. The token stays in browser memory and is sent through the local backend; it is not saved in localStorage, SQLite or logs.

With Arduino CLI available, run `./check-builds.ps1` from this directory. It compiles both modes without uploading. Install dependencies first using the commands in that script's header. Compilation does not validate electrical installation.

## Confirmed prototype topology and measurement boundary

The user specified a protected TP4056 board with DW01A and OUT+/OUT− pads. INA219 measures the protected battery output before a 5V boost converter. A 3.0–4.2V cell cannot directly provide a regulated 5V fan supply: use the configured boost converter for a 5V fan. Power the ESP32/relay driver independently for clean load measurements, or include their consumption explicitly.

| Interface | Connection / meaning |
| --- | --- |
| INA219 logic | 3.3V logic supply and pull-ups; SDA GPIO21, SCL GPIO22, address 0x40 |
| Current measurement | Protected OUT+ to INA219 VIN+, VIN− to the load/boost branch; reference ground is protected OUT− |
| Cell-side voltage | INA219 bus voltage plus shunt drop; never connect this sensor to a 48V pack or AC |
| Relay control | GPIO26 to a **3.3V-compatible driver input**, never directly to the coil |
| Fan supply | Regulated 5V boost output through appropriately rated normally-open relay contacts |
| Reset behavior | External resistor holds the relay driver OFF while ESP32 pins are high impedance; verify active-low/high polarity |

The UI reports **battery-side load draw**, including boost losses/idle consumption if present. It does not falsely label that as the fan's 5V-side current. OFF readings are actual measurements and can be nonzero if the boost converter remains powered or other loads share the shunt. To measure fan-side draw and raw battery voltage simultaneously, add another sensor or a correctly designed battery-voltage measurement channel.

SoC is `clamp((Vcell − 3.0) / 1.2 × 100, 0, 100)`, explicitly a rough voltage estimate. It is affected by load, charging, cell chemistry, temperature and aging. 3.92V maps to about 77%, not an exact 76%. A coulomb-counting fuel gauge and calibration are needed for more credible SoC. DW01A protection does not make voltage-derived SoC exact.

A protected TP4056 module is not automatically a power-path/load-sharing charger or an MPPT controller. Validate the small panel's available voltage/current, charger current setting and behavior with a simultaneous load; do not assume the panel can sustain the fan. Protection remains necessary independent of ESP32 software.

## Residential adapter

UART1 uses RX32/TX33 and DE/RE25 by default. It is a **read-only master on the inverter's supported monitoring port**, not an additional master on a live inverter↔BMS link. The inverter must already communicate correctly with its LiFePO4 BMS. This implementation reads inverter-reported SoC; it does not claim a universal direct BMS protocol.

The Growatt-authored SPF5000 RTU V0.11 profile is provided as a specific configurable adapter:

| FC04 input register (decimal) | Decode |
| --- | --- |
| 17 | Battery voltage, uint16 × 0.01 V |
| 18 | Inverter-reported SoC, uint16 % |
| 77–78 | Battery power, high-word first signed int32 × 0.1 W; positive discharge, negative charge |

9600 8N1, slave 1 default. Two alternating requests are spaced at least one second apart. No inverter settings are written. **SPF 5000 ES / Inverex branding alone does not prove this profile matches a particular firmware.** Compare with the device's official map and front-panel readings before setting the confirmation flags.

UART2 RX16/TX17 uses PZEM004T v3's TTL serial interface at 9600 8N1. The library decodes input registers 0x0000–0x0009; voltage is ×0.1V, current ×0.001A, power ×0.1W, energy in Wh (library returns kWh). Multiword current/power/energy are low-word first. The PZEM is the controlled AC branch meter; Growatt battery-power telemetry accounts for battery drain across the inverter, including other loads. A stopped controlled load does not imply zero whole-house drain.

A MAX485 is a 5V part; use an appropriate 3.3V-compatible/isolated RS485 transceiver or correctly engineered level translation. Do not feed a 5V receiver output into ESP32 GPIO. The PZEM interface also needs verified logic compatibility and isolation. GPIO26 controls a suitable isolated driver for a rated contactor; it never directly drives an AC coil. A 30A contactor label is not sufficient to approve wiring, motor inrush, branch protection or enclosure design. A qualified installer must commission residential mains hardware; no mains wiring is validated by this software.

## Unified API

Direct device routes (TCP80, private LAN only):

- `GET /status` with `X-Device-Token` returns schema-1 status. Authenticated polling renews the connection lease.
- `POST /control?relay=1&timer=0` uses the current cutoff. Optional `cutoff=20`, `mode=PROTOTYPE_5V_DC` and UUID `request_id` are used by the app.
- `POST /control?relay=0&timer=0` turns OFF even with invalid sensors. `timer` is whole **minutes**, 0–1440; cutoff is a whole 5–95 percent.
- OPTIONS provides CORS preflight. Only `http://127.0.0.1:5173` and `http://localhost:5173` browser origins are allowed; token-authenticated requests without Origin support the backend bridge. CORS is not authentication.

Status includes `mode`, `device_id`, `sensor_ok`, `control_enabled`, `sample_age_ms`, `battery_voltage`, `soc_pct`, `soc_method`, `capacity_wh`, signed `battery_power_w`, `load_voltage`, `load_current_a`, `load_power_w`, `energy_kwh`, `relay_on`, `uptime_seconds`, `timer_remaining_seconds`, `cutoff_pct` and `fault`. Unavailable measurements are JSON null, never zero substitutes. `relay_on` is the output command, not auxiliary-contact feedback. Run-time counts relay-ON intervals with positive measured branch power, not independently sensed fan rotation. It resets at a new ON run and reboot, and freezes at OFF. Prototype energy integrates since boot; PZEM energy is the meter's cumulative counter, not a session total.

The frontend sends JSON to local-only `POST /api/hardware/status` or `/api/hardware/control`. Numeric RFC1918 IPv4 addresses only, fixed paths and port, redirects disabled, 3-second device timeout, bounded response size, schema/mode checks, trusted browser Origin and token required. This avoids browser private-network restrictions while preventing arbitrary URL proxying. HTTP tokens are not encrypted on the LAN: use a trusted isolated local network, not public hosting or internet port forwarding. Firmware does not support OTA or internet exposure here.

The bridge verifies status before ON and never retries a control command automatically. Device UUID command IDs suppress recent duplicate ON commands. OFF is always idempotent. A new Apply Limits command restarts the timer from now; it does not reset active run-time. The recent-ID cache holds 16 commands and is not persistent across resets.

## Protection, simulation and predictions

The relay starts OFF and never automatically restarts after reboot, low battery or reconnection. A dedicated 20ms protection task runs separately from HTTP and sensor transactions. It stops on invalid/stale (>5s) telemetry, Wi-Fi loss, 15 seconds without an authenticated client, timer expiry, battery cutoff or configured current limits. Sampling is approximately once per second; software is not a fuse, BMS or certified safety controller. GPIO defaults and external hardware protection must work with firmware absent.

An unavailable ESP32 produces an explicitly labeled, interactive simulation. A lost control acknowledgement marks the real outcome **unknown**; the UI does not claim a real shutdown. Simulation starts independently with relay OFF. Connecting again reads the device and **never replays simulation commands**. Closing/navigating away from the panel ends polling and the device lease expires. Do not use this browser-dependent prototype for unattended critical loads.

Simulation defaults are examples: 2Ah × 3.7V and 215mA for Case 1; 100Ah × 51.2V and an 800W branch at 90% efficiency for Case 2. These are not measured household capacities. The display-only 1,000× prototype scale multiplies power and energy; it does not alter sensor voltage/current, SoC, hardware commands or time predictions. Residential scale is always 1×.

Backup seconds = capacity Wh × max(SoC − cutoff, 0)/100 ÷ positive battery discharge W × 3600. Charging, zero draw, missing capacity and stale data show unavailable, not infinity. This simple constant-drain estimate does not model future PV, battery derating or changing appliances. The predictor includes the earlier of timer expiry and battery cutoff, merges overlapping daily outage windows in Asia/Karachi, and compares against manually entered expected return times. It does not fetch or verify K-Electric schedules. A timer may deliberately create an appliance-off interval while preserving battery; it does not guarantee continuous home backup.

## Verification and remaining commissioning

Frontend/model tests and local bridge tests cover mode/host validation, timer/cutoff behavior, unavailable readings, overnight overlaps, failed acknowledgements and no simulation replay. Real voltage/current calibration, relay polarity, reset behavior, disconnection shutdown and both production serial devices must be verified on the actual hardware.

Firmware was generated and source-reviewed, **not compiled, uploaded or bench-tested** in this session: Arduino CLI was absent and Windows denied the official-tool download. Use the provided build script and record the exact board/core/library versions when compiling. Do not interpret the mode name PRODUCTION_220V_AC as a certification or a completed residential deployment.

## Primary technical references

- [TI INA219 datasheet](https://www.ti.com/lit/ds/symlink/ina219.pdf): I2C sensor and 26V bus limit.
- [Adafruit INA219 library](https://github.com/adafruit/Adafruit_INA219): calibration and read-error API.
- [Growatt-authored SPF RTU V0.11, mirrored PDF](https://cdn.hackaday.io/files/1924318232967904/GrowattModBusProtocol.pdf): pp. 8, 13, 15; model/firmware compatibility still requires confirmation.
- [PZEM library and protocol decoding](https://github.com/mandulaj/PZEM-004T-v30): UART API, register order and units.
- [ModbusMaster API](https://4-20ma.io/ModbusMaster/class_modbus_master.html): FC04 reads and RS485 direction callbacks.
- [ESP32 datasheet](https://documentation.espressif.com/esp32_datasheet_en.html) and [MAX485 specification](https://www.analog.com/en/products/max485.html): logic voltage constraints.
