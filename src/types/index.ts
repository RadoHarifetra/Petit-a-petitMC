export type Currency = 'EUR' | 'USD' | 'CNY' | 'MGA';
export type ShippingType = 'SEA' | 'AIR' | 'EXPRESS';
export type QuoteStatus = 'ORDERED' | 'SENT' | 'REJECTED';
export type OrderStatus = 'PREPARATION' | 'TRANSIT' | 'WAREHOUSE' | 'DELIVERED' | 'COLLECTED';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  labels: string[];
  createdAt: any;
}

export interface Forwarder {
  id: string;
  name: string;
  seaRate: number; // USD per m3
  airRate: number; // MGA per KG
  expressRate: number; // MGA per KG
  createdAt: any;
}

export interface QuoteItem {
  type: string;
  purchasePrice: number;
  currency: Currency;
  salePriceMGA: number;
  profit: number;
}

export interface Quote {
  id: string;
  clientId: string;
  forwarderId?: string;
  weight?: number;
  volume?: number;
  shippingType?: ShippingType;
  items: QuoteItem[];
  status: QuoteStatus;
  totalProfit: number;
  createdAt: any;
}

export interface Order {
  id: string;
  quoteId?: string;
  clientId: string;
  forwarderId?: string;
  items: QuoteItem[];
  status: OrderStatus;
  trackingNumber?: string;
  freightForwarder?: string;
  weight: number;
  volume?: number;
  shippingType: ShippingType;
  shippingCostMGA: number;
  totalToPayMGA: number;
  deliveryFeeMGA: number;
  eta: any;
  sentAt: any;
  arrivedAt?: any;
  collectedAt?: any;
  createdAt: any;
}

export interface LogisticsSettings {
  seaRate: number; // USD
  airRatePerKg: number; // MGA
  expressRatePerKg: number; // MGA
  lastExchangeRates?: {
    USD: number;
    EUR: number;
    CNY: number;
  };
  updatedAt: any;
}
