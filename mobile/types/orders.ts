export type OrderCardItem = {
  id: string;
  title: string;
  subtitle?: string;
  orderNumber?: string;
  price?: number | string;
  status: string; // normalized status key from backend
  displayStatus?: string; // human-friendly status text
  arrivalText?: string;
  raw?: any;
};
