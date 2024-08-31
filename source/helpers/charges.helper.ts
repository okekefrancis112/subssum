import { WALLET_CONSTANT } from "../constants/wallet.constant";

export const paystack_charge = (amount: number): number => {
  // The percentage charge is 2%
  const percentage = 2;
  // The flat charge is 80
  const flat = 80;
  // Calculate the total charge
  const total = (amount * percentage) / 100 + flat;

  // If the total charge is more than 2000, return 2000
  if (total > 2000) return 2000;

  // Return the total charge
  return total;
};

export const flutterwave_ngn_charge = (amount: number): number => {
  // The percentage charge is 1.4%
  const percentage = 1.4;
  // The flat charge is 50
  const flat = 50;
  // Calculate the total charge
  const total = (amount * percentage) / 100 + flat;

  // If the total charge is more than 2000, return 2000
  if (total > 2000) return 2000;

  // Return the total charge
  return total;
};

export const flutterwave_usd_charge = (amount: number): number => {
  // The percentage charge is 3.8%
  const percentage = 4;
  // The flat charge is 0
  const flat = 0;
  // Calculate the total charge
  const total = (amount * percentage) / 100 + flat;

  // Return the total charge
  return total;
};

export const diaspora_usd_charge = (amount: number): number => {
 
  // The flat charge is 0
  const flat = 0;
  // Calculate the total charge
  const total = (amount * WALLET_CONSTANT.DIASPORA_CHARGE_PERCENT) / 100 + flat;

  // Return the total charge
  return total;
};

// This function calculates the charge for a given amount
export const mono_charge = (amount: number): number => {
  let percent; // Variable to store the percentage of charge
  let total; // Variable to store the total charge

  // If the amount is less than 1500, then the charge is 0.5% of the amount
  if (amount < 1500) {
    percent = 0.5;
    total = amount * (percent / 100);
  }
  // If the amount is greater than or equal to 1500, then the charge is 0.5% of the amount plus 60
  else if (amount >= 1500) {
    percent = 0.5;
    total = amount * (percent / 100) + 60;
  }

  // Return 500 if the total charge is more than 500, otherwise return the total charge or 0 if there is no charge
  return total && total > 500 ? 500 : total || 0;
};
