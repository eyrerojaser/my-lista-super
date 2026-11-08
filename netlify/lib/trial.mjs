// Días de prueba gratis sin tarjeta para las cuentas nuevas (variable FREE_TRIAL_DAYS; 14 si no se pone; 0 = sin prueba).
export const trialDays = () => {
  const v = process.env.FREE_TRIAL_DAYS;
  const n = v === undefined || v === "" ? 14 : +v;
  return Number.isFinite(n) ? Math.max(0, Math.min(90, Math.round(n))) : 14;
};
