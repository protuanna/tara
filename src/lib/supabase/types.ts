// Hand-written to match supabase/migrations/*.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
// and reconcile any drift with the migration files (source of truth).
//
// Shape (Row/Insert/Update/Relationships, and the Functions/Enums/
// CompositeTypes keys below) mirrors what `supabase gen types` outputs —
// @supabase/postgrest-js's generic helpers expect exactly this structure,
// trimming any of it makes embedded-select (`select("*, foo(bar)")`) typing
// silently resolve to `never`.

export type FulfillmentStatus = "pending" | "processing" | "done" | "cancel";
export type PaymentStatus = "paid" | "debt" | "unpaid";
export type PaymentMethod = "cash" | "qr" | "debt" | "unpaid";
export type DiscountType = "vnd" | "pct";
export type CashEntryType = "thu" | "chi";

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          category_id: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          category_id?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          fulfillment_status: FulfillmentStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod;
          subtotal: number;
          fee: number;
          topping_fee: number;
          discount_amount: number;
          discount_raw: number;
          discount_type: DiscountType;
          total: number;
          payos_order_code: number | null;
          payos_qr_code: string | null;
          payos_checkout_url: string | null;
          payos_payment_link_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          fulfillment_status?: FulfillmentStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod;
          subtotal?: number;
          fee?: number;
          topping_fee?: number;
          discount_amount?: number;
          discount_raw?: number;
          discount_type?: DiscountType;
          total?: number;
          payos_order_code?: number | null;
          payos_qr_code?: string | null;
          payos_checkout_url?: string | null;
          payos_payment_link_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          name: string;
          price: number;
          qty: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          name: string;
          price: number;
          qty: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          body: string;
          url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          name: string;
          amount: number;
          note: string | null;
          type: CashEntryType;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          amount: number;
          note?: string | null;
          type?: CashEntryType;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      customer_debts: {
        Row: {
          customer_id: string | null;
          name: string | null;
          phone: string | null;
          debt: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      next_payos_order_code: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      fulfillment_status: FulfillmentStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      discount_type: DiscountType;
      cash_entry_type: CashEntryType;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** Sentinel "Khách lẻ" (walk-in) customer id, seeded by the initial migration. */
export const WALKIN_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";
