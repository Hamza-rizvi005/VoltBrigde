#pragma once
#include <Arduino.h>
#include <math.h>
struct Measurements {
  float batteryV = NAN, soc = NAN, batteryW = NAN, loadV = NAN, loadA = NAN, loadW = NAN, energyKwh = 0;
  uint32_t batteryAt = 0, powerAt = 0, loadAt = 0;
  bool batteryValid = false, powerValid = false, loadValid = false;
};
class HardwareHAL {
public:
  virtual void begin() = 0;
  virtual void sample(Measurements& data) = 0;
  virtual float capacityWh() const = 0;
  virtual const char* socMethod() const = 0;
  virtual bool controlEnabled() const = 0;
  virtual ~HardwareHAL() = default;
};
