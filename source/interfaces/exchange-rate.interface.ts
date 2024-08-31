// Import mongoose module Document & Types
import { Document, Types } from 'mongoose';

// Enumeration of the different currencies
export enum ICurrency {
  NGN = 'NGN',
    USD = 'USD',
    GBP = 'GBP',
    EUR = 'EUR',
    CAD = 'CAD',
  }

// Creating a list of all valid values for ICurrency
export const ICurrencyList = [
  ICurrency.NGN,
  ICurrency.USD,
  ICurrency.GBP,
  ICurrency.EUR,
  ICurrency.CAD,
];

// Interface for FAQs
export interface IExchangeRate {

    // Currency of the exchange_rate
    currency: string;

    // Third Party buy rate string
    third_party_buy_rate: string;

    // Third Party buy rate string
    third_party_sell_rate: string;

    // Keble buy rate string
    keble_buy_rate: string;

    // Keble sell string
    keble_sell_rate: string;

    // Keble default rate
    is_default?: boolean;

    // ID of the user who created this Exchange rate
    created_by: Types.ObjectId;

    // ! new exchange rate design

    // NGN - USD buy string
    ngn_usd_buy_rate: number;

    // NGN - USD sell string
    ngn_usd_sell_rate: number;

    // EUR - USD buy string
    eur_usd_buy_rate: number;

    // EUR - USD sell string
    eur_usd_sell_rate: number;

    // GBP - USD buy string
    gbp_usd_buy_rate: number;

    // GBP - USD sell string
    gbp_usd_sell_rate: number;

    // CAD - USD buy string
    cad_usd_buy_rate: number;

    // CAD - USD sell string
    cad_usd_sell_rate: number;
}

// Sub-interface of IExchangeRate with Document type

export interface IExchangeRateDocument extends Document, IExchangeRate {}
