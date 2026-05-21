// IPO → exchange-symbol mappings. Currently empty because every "listed" IPO
// in the master snapshot is synthetic seed data (Lumino Hyperscale, Greendale
// Cement) for which no real BSE scripcode / NSE symbol exists.
//
// As real IPOs list, populate these maps so Phase 2C (listing performance
// + sector) can fetch from BSE historical and NSE quote endpoints.
//
// Format:
//   BSE_SCRIPCODES[ipo_id] = "<6-digit scripcode>"
//   NSE_SYMBOLS[ipo_id]    = "<NSE symbol>"

export const BSE_SCRIPCODES: Record<string, string> = {
  // e.g. "incred-holdings": "543930",
};

export const NSE_SYMBOLS: Record<string, string> = {
  // e.g. "incred-holdings": "INCRED",
};

export function bseScripcodeFor(ipo_id: string): string | null {
  return BSE_SCRIPCODES[ipo_id] ?? null;
}

export function nseSymbolFor(ipo_id: string): string | null {
  return NSE_SYMBOLS[ipo_id] ?? null;
}
