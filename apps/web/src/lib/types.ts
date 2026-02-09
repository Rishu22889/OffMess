export type UserRole = "STUDENT" | "CANTEEN_ADMIN" | "CAMPUS_ADMIN";
export type OrderStatus =
  | "REQUESTED"
  | "DECLINED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "COLLECTED"
  | "CANCELLED_TIMEOUT";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
export type PaymentMethod = "ONLINE" | "COUNTER" | "UPI_QR" | "UPI_INTENT";  // UPI_QR and UPI_INTENT are legacy

export interface User {
  id: number;
  role: UserRole;
  email?: string | null;
  roll_number?: string | null;
  canteen_id?: number | null;
  name?: string | null;
  phone_number?: string | null;
  hostel_name?: string | null;
}

export interface Canteen {
  id: number;
  name: string;
  hours_open: string;
  hours_close: string;
  avg_prep_minutes: number;
  upi_id: string;
  max_active_orders: number;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  canteen_id: number;
  name: string;
  price_cents: number;
  is_available: boolean;
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Payment {
  id: number;
  amount_cents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  qr_payload: string;
  created_at: string;
  paid_at?: string | null;
}

export interface OrderEvent {
  id: number;
  from_status?: OrderStatus | null;
  to_status: OrderStatus;
  created_at: string;
  actor_user_id?: number | null;
}

export interface Order {
  id: number;
  order_number: string;
  student_id: number;
  canteen_id: number;
  status: OrderStatus;
  total_amount_cents: number;
  payment_expires_at?: string | null;
  accepted_at?: string | null;
  paid_at?: string | null;
  collected_at?: string | null;
  cancelled_at?: string | null;
  pickup_code?: string | null;
  decline_reason?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  payment?: Payment | null;
  events: OrderEvent[];
  queue_position?: number | null;
  estimated_minutes?: number | null;
  // Student information for admin view
  student_name?: string | null;
  student_roll_number?: string | null;
  student_phone_number?: string | null;
}

export interface OrderResponse {
  order: Order;
}

export interface StatsRow {
  canteen_id: number;
  canteen_name: string;
  status: OrderStatus;
  count: number;
}

export interface MessMenu {
  id: number;
  hostel_name: string;
  day_of_week: number; // 0=Monday, 6=Sunday
  breakfast?: string | null;
  lunch?: string | null;
  snacks?: string | null;
  dinner?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessMenuListResponse {
  total: number;
  items: MessMenu[];
}
