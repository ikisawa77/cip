export const now = () => new Date();
export const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);
