// mongoose is used to create a database model
import mongoose, { Schema } from 'mongoose';


// Import interfaces for listing status and audience
import {
  ICurrency,
  ICurrencyList,
} from '../interfaces/exchange-rate.interface';


// ExchangeRateSchema here refers to the database schema for ExchangeRates
export const ExchangeRateSchema: Schema = new Schema(
  {

    // currency stores the actual currency type
    currency: {
      type: String,
      default: ICurrency.USD,
      enum: ICurrencyList,
    },

    // third_party_buy_rate stores the buy rate of the currency from the third party
    third_party_buy_rate: {
      type: String,
    },

    // third_party_sell_rate stores the sell rate of the currency from the third party
    third_party_sell_rate: {
      type: String,
    },

    // keble_buy_rate stores the buy rate of the currency from the Keble
    keble_buy_rate: {
        type: String,
    },

    // keble_sell_rate stores the sell rate of the currency from the Keble
    keble_sell_rate: {
      type: String,
    },

    // Define the default status
    is_default: {
      type: Boolean,
      default: false,
    },

    // this points to the admin user who creates the exchange-rate
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUsers',
    },

    // ! new exchange rate design

    // ngn_usd_buy_rate stores the buy rate of the NGN to the USD
    ngn_usd_buy_rate: {
      type: Number,
      default: 0,
    },

    // ngn_usd_sell_rate stores the sell rate of the NGN to the USD
    ngn_usd_sell_rate: {
      type: Number,
      default: 0,
    },

    // eur_usd_buy_rate stores the buy rate of the EUR to the USD
    eur_usd_buy_rate: {
      type: Number,
      default: 0,
    },

    // eur_usd_buy_rate stores the buy rate of the EUR to the USD
    eur_usd_sell_rate: {
      type: Number,
      default: 0,
    },

    // gbp_usd_buy_rate stores the buy rate of the GBP to the USD
    gbp_usd_buy_rate: {
      type: Number,
      default: 0,
    },

    // gbp_usd_sell_rate stores the sell rate of the GBP to the USD
    gbp_usd_sell_rate: {
      type: Number,
      default: 0,
    },

    // cad_usd_buy_rate stores the buy rate of the CAD to the USD
    cad_usd_buy_rate: {
      type: Number,
      default: 0,
    },

    // cad_usd_sell_rate stores the sell rate of the CAD to the USD
    cad_usd_sell_rate: {
      type: Number,
      default: 0,
    },
  },

  // timestamps adds two fields - createdAt and updatedAt into our schema, which will be automatically managed by mongoose.
  { timestamps: true }
);
