// Días de prueba gratis sin tarjeta para las cuentas nuevas (variable FREE_TRIAL_DAYS; 14 si no se pone; 0 = sin prueba).
export const trialDays = () => {
  const v = process.env.FREE_TRIAL_DAYS;
  const n = v === undefined || v === "" ? 14 : +v;
  return Number.isFinite(n) ? Math.max(0, Math.min(90, Math.round(n))) : 14;
};
// Con la prueba gratis activa ya no se regalan más cuentas de fundadora (las que ya lo son, lo siguen siendo).
// Para volver a abrir lugares de fundadora: FREE_TRIAL_DAYS=0 o FOUNDERS_OPEN=1.
export const foundersOpen = () => process.env.FOUNDERS_OPEN === "1" || trialDays() === 0;
